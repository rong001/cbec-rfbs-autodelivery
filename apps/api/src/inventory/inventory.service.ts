import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AdjustStockDto } from './inventory.dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.inventoryItem.findMany({
      include: { product: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async adjust(productId: string, dto: AdjustStockDto, actorUserId?: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { productId },
    });
    if (!item) throw new NotFoundException('Inventory item not found');
    const next = item.qtyOnHand + dto.delta;
    if (next < 0) {
      throw new BadRequestException('Insufficient stock for adjustment');
    }
    const updated = await this.prisma.inventoryItem.update({
      where: { productId },
      data: {
        qtyOnHand: next,
        reorderPoint: dto.reorderPoint ?? undefined,
      },
    });
    await this.audit.log({
      actorUserId,
      action: 'INVENTORY_ADJUST',
      entityType: 'InventoryItem',
      entityId: item.id,
      beforeJson: { qtyOnHand: item.qtyOnHand, reorderPoint: item.reorderPoint },
      afterJson: {
        qtyOnHand: updated.qtyOnHand,
        reorderPoint: updated.reorderPoint,
        delta: dto.delta,
        reason: dto.reason ?? null,
      },
    });
    return updated;
  }
}
