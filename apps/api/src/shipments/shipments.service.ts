import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LabelShipmentDto } from './shipments.dto';

@Injectable()
export class ShipmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.shipment.findMany({
      include: { order: { include: { lines: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getByOrder(orderId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { orderId },
      include: { order: { include: { lines: true } } },
    });
    if (!shipment) throw new NotFoundException('Shipment not found');
    return shipment;
  }

  /**
   * Generate an INTERNAL tracking number — NOT a real carrier API.
   * Format: INT-MOCK-<timestamp>-<random>
   */
  async label(orderId: string, dto: LabelShipmentDto, actorUserId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { shipment: true, lines: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (
      !['APPROVED', 'AWAITING_SHIPMENT', 'PENDING_PROCUREMENT'].includes(
        order.status,
      )
    ) {
      throw new BadRequestException(
        `Cannot label order in status ${order.status}`,
      );
    }

    const trackingNo = `INT-MOCK-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;
    const carrier =
      dto.carrier ||
      order.shipment?.carrier ||
      'INTERNAL_MOCK_CARRIER';

    const shipment = await this.prisma.$transaction(async (tx) => {
      const s = await tx.shipment.upsert({
        where: { orderId },
        create: {
          orderId,
          trackingNo,
          carrier,
          labeledAt: new Date(),
        },
        update: {
          trackingNo,
          carrier,
          labeledAt: new Date(),
        },
      });
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'AWAITING_SHIPMENT' },
      });
      await this.audit.log({
        actorUserId,
        action: 'SHIPMENT_LABEL',
        entityType: 'Shipment',
        entityId: s.id,
        afterJson: {
          trackingNo,
          carrier,
          note: 'INTERNAL tracking — not a live carrier API',
        },
        tx,
      });
      return s;
    });

    return {
      ...shipment,
      _meta: {
        trackingSource: 'INTERNAL_GENERATED',
        carrierApi: false,
        honesty:
          'Tracking number is generated locally for closed-loop demo. Ozon/carrier APIs are NOT_CONFIGURED.',
      },
    };
  }

  async ship(orderId: string, actorUserId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { shipment: true, lines: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!order.shipment?.trackingNo || !order.shipment.labeledAt) {
      throw new BadRequestException('Label shipment before shipping');
    }
    if (order.status === 'SHIPPED') {
      throw new BadRequestException('Already shipped');
    }
    if (order.status !== 'AWAITING_SHIPMENT' && order.status !== 'APPROVED') {
      throw new BadRequestException(
        `Cannot ship order in status ${order.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      for (const line of order.lines) {
        const inv = await tx.inventoryItem.findUnique({
          where: { productId: line.productId },
        });
        if (!inv) {
          throw new BadRequestException(
            `No inventory for product ${line.productId}`,
          );
        }
        if (inv.qtyOnHand < line.qty) {
          throw new BadRequestException(
            `Insufficient stock for SKU ${line.sku}: have ${inv.qtyOnHand}, need ${line.qty}`,
          );
        }
        const updated = await tx.inventoryItem.update({
          where: { productId: line.productId },
          data: { qtyOnHand: inv.qtyOnHand - line.qty },
        });
        await this.audit.log({
          actorUserId,
          action: 'INVENTORY_DECREMENT_ON_SHIP',
          entityType: 'InventoryItem',
          entityId: inv.id,
          beforeJson: { qtyOnHand: inv.qtyOnHand },
          afterJson: { qtyOnHand: updated.qtyOnHand, delta: -line.qty },
          tx,
        });
      }

      const shipment = await tx.shipment.update({
        where: { orderId },
        data: { shippedAt: new Date() },
      });
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: 'SHIPPED' },
        include: { lines: true, shipment: true },
      });
      await this.audit.log({
        actorUserId,
        action: 'SHIPMENT_SHIP',
        entityType: 'Order',
        entityId: orderId,
        beforeJson: { status: order.status },
        afterJson: {
          status: 'SHIPPED',
          trackingNo: shipment.trackingNo,
          shippedAt: shipment.shippedAt,
        },
        tx,
      });
      return updatedOrder;
    });
  }
}
