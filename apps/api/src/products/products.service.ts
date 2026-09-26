import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  ClaimFromSelectionDto,
  CreateProductDto,
  UpdateProductDto,
} from './products.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(shopId?: string) {
    return this.prisma.product.findMany({
      where: shopId ? { shopId } : undefined,
      include: { inventory: true, listings: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { inventory: true, listings: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(dto: CreateProductDto, actorUserId?: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id: dto.shopId } });
    if (!shop) throw new NotFoundException('Shop not found');
    try {
      const product = await this.prisma.product.create({
        data: {
          shopId: dto.shopId,
          sku: dto.sku,
          title: dto.title,
          costCny: new Prisma.Decimal(dto.costCny),
          weightG: dto.weightG,
          status: dto.status,
        },
      });
      await this.audit.log({
        actorUserId,
        action: 'PRODUCT_CREATE',
        entityType: 'Product',
        entityId: product.id,
        afterJson: product as object,
      });
      return product;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('SKU already exists for shop');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateProductDto, actorUserId?: string) {
    const before = await this.get(id);
    const product = await this.prisma.product.update({
      where: { id },
      data: {
        title: dto.title,
        costCny:
          dto.costCny !== undefined
            ? new Prisma.Decimal(dto.costCny)
            : undefined,
        weightG: dto.weightG,
        status: dto.status,
      },
    });
    await this.audit.log({
      actorUserId,
      action: 'PRODUCT_UPDATE',
      entityType: 'Product',
      entityId: id,
      beforeJson: before as object,
      afterJson: product as object,
    });
    return product;
  }

  async remove(id: string, actorUserId?: string) {
    const before = await this.get(id);
    await this.prisma.product.delete({ where: { id } });
    await this.audit.log({
      actorUserId,
      action: 'PRODUCT_DELETE',
      entityType: 'Product',
      entityId: id,
      beforeJson: before as object,
    });
    return { deleted: true, id };
  }

  /** Claim from selection: create product + listing draft (provisional domain). */
  async claimFromSelection(dto: ClaimFromSelectionDto, actorUserId?: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id: dto.shopId } });
    if (!shop) throw new NotFoundException('Shop not found');

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          shopId: dto.shopId,
          sku: dto.sku,
          title: dto.title,
          costCny: new Prisma.Decimal(dto.costCny),
          weightG: dto.weightG,
          status: 'DRAFT',
        },
      });
      const listing = await tx.listing.create({
        data: {
          productId: product.id,
          titleRu: dto.titleRu ?? dto.title,
          status: 'DRAFT',
        },
      });
      await this.audit.log({
        actorUserId,
        action: 'PRODUCT_CLAIM_FROM_SELECTION',
        entityType: 'Product',
        entityId: product.id,
        afterJson: { product, listing } as object,
        tx,
      });
      return { product, listing };
    });
  }
}
