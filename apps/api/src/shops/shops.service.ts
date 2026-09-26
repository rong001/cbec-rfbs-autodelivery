import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateShopDto } from './shops.dto';

@Injectable()
export class ShopsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.shop.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async get(id: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id } });
    if (!shop) throw new NotFoundException('Shop not found');
    return shop;
  }

  async create(dto: CreateShopDto, actorUserId?: string) {
    const shop = await this.prisma.shop.create({
      data: {
        name: dto.name,
        platform: dto.platform,
        externalShopId: dto.externalShopId,
        status: dto.status,
      },
    });
    await this.audit.log({
      actorUserId,
      action: 'SHOP_CREATE',
      entityType: 'Shop',
      entityId: shop.id,
      afterJson: shop as object,
    });
    return shop;
  }
}
