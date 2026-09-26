import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ListingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  AdvanceListingDto,
  CreateListingDto,
  PublishListingDto,
} from './listings.dto';

const ADVANCE_MAP: Record<string, ListingStatus[]> = {
  DRAFT: ['MAPPING', 'FAILED'],
  MAPPING: ['READY', 'FAILED', 'DRAFT'],
  READY: ['PUBLISHED', 'FAILED', 'MAPPING'],
  FAILED: ['DRAFT', 'MAPPING'],
  PUBLISHED: [],
};

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(productId?: string) {
    return this.prisma.listing.findMany({
      where: productId ? { productId } : undefined,
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: { product: { include: { inventory: true } } },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  async create(dto: CreateListingDto, actorUserId?: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Product not found');
    const listing = await this.prisma.listing.create({
      data: { productId: dto.productId, titleRu: dto.titleRu, status: 'DRAFT' },
    });
    await this.audit.log({
      actorUserId,
      action: 'LISTING_CREATE',
      entityType: 'Listing',
      entityId: listing.id,
      afterJson: listing as object,
    });
    return listing;
  }

  async advance(id: string, dto: AdvanceListingDto, actorUserId?: string) {
    const listing = await this.get(id);
    if (dto.status === 'PUBLISHED') {
      throw new BadRequestException('Use POST /listings/:id/publish to publish');
    }
    const allowed = ADVANCE_MAP[listing.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot advance from ${listing.status} to ${dto.status}`,
      );
    }
    const updated = await this.prisma.listing.update({
      where: { id },
      data: { status: dto.status },
    });
    await this.audit.log({
      actorUserId,
      action: 'LISTING_ADVANCE',
      entityType: 'Listing',
      entityId: id,
      beforeJson: { status: listing.status },
      afterJson: { status: updated.status },
    });
    return updated;
  }

  async publish(id: string, dto: PublishListingDto, actorUserId?: string) {
    const listing = await this.get(id);
    if (listing.status !== 'READY' && listing.status !== 'DRAFT' && listing.status !== 'MAPPING') {
      if (listing.status === 'PUBLISHED') {
        throw new BadRequestException('Already published');
      }
      throw new BadRequestException(
        `Cannot publish from status ${listing.status}`,
      );
    }
    const initialQty = dto.initialQty ?? 0;
    const reorderPoint = dto.reorderPoint ?? 5;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.listing.update({
        where: { id },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      });
      await tx.product.update({
        where: { id: listing.productId },
        data: { status: 'ACTIVE' },
      });
      const inventory = await tx.inventoryItem.upsert({
        where: { productId: listing.productId },
        create: {
          productId: listing.productId,
          qtyOnHand: initialQty,
          reorderPoint,
        },
        update: {},
      });
      await this.audit.log({
        actorUserId,
        action: 'LISTING_PUBLISH',
        entityType: 'Listing',
        entityId: id,
        beforeJson: { status: listing.status },
        afterJson: { listing: updated, inventory } as object,
        tx,
      });
      return { listing: updated, inventory };
    });
  }
}
