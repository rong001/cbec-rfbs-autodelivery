import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateOrderDto } from './orders.dto';

@Injectable()
export class OrdersService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultRules();
  }

  private async ensureDefaultRules() {
    const count = await this.prisma.fulfillmentRule.count();
    if (count > 0) return;
    await this.prisma.fulfillmentRule.createMany({
      data: [
        {
          name: 'auto-approve-pending',
          enabled: true,
          priority: 10,
          conditionJson: { status: 'PENDING_REVIEW' },
          actionJson: { type: 'AUTO_APPROVE' },
        },
        {
          name: 'suggest-carrier-internal',
          enabled: true,
          priority: 20,
          conditionJson: {
            statusIn: ['APPROVED', 'AWAITING_SHIPMENT', 'PENDING_PROCUREMENT'],
          },
          actionJson: {
            type: 'SUGGEST_CARRIER',
            carrier: 'INTERNAL_MOCK_CARRIER',
          },
        },
        {
          name: 'mark-procurement-if-low-stock',
          enabled: true,
          priority: 15,
          conditionJson: { checkInventory: true },
          actionJson: { type: 'MARK_PENDING_PROCUREMENT' },
        },
      ],
    });
  }

  list() {
    return this.prisma.order.findMany({
      include: { lines: true, shipment: true, shop: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { lines: true, shipment: true, shop: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async create(dto: CreateOrderDto, actorUserId?: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id: dto.shopId } });
    if (!shop) throw new NotFoundException('Shop not found');

    const productIds = dto.lines.map((l) => l.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products not found');
    }
    const byId = new Map(products.map((p) => [p.id, p]));

    let total = new Prisma.Decimal(0);
    const lineData = dto.lines.map((l) => {
      const p = byId.get(l.productId)!;
      const unit = new Prisma.Decimal(l.unitPrice);
      total = total.add(unit.mul(l.qty));
      return {
        productId: l.productId,
        sku: p.sku,
        qty: l.qty,
        unitPrice: unit,
      };
    });

    const orderNo =
      dto.orderNo ??
      `LOC-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const order = await this.prisma.order.create({
      data: {
        shopId: dto.shopId,
        orderNo,
        status: 'PENDING_REVIEW',
        totalAmount: total,
        currency: dto.currency ?? 'RUB',
        buyerNote: dto.buyerNote,
        etaHours: dto.etaHours,
        lines: { create: lineData },
      },
      include: { lines: true },
    });

    await this.audit.log({
      actorUserId,
      action: 'ORDER_CREATE',
      entityType: 'Order',
      entityId: order.id,
      afterJson: order as object,
    });
    return order;
  }

  async approve(id: string, actorUserId?: string) {
    const order = await this.get(id);
    if (order.status !== 'PENDING_REVIEW' && order.status !== 'PENDING_PROCUREMENT') {
      throw new BadRequestException(
        `Cannot approve from status ${order.status}`,
      );
    }
    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: 'APPROVED' },
      include: { lines: true, shipment: true },
    });
    await this.audit.log({
      actorUserId,
      action: 'ORDER_APPROVE',
      entityType: 'Order',
      entityId: id,
      beforeJson: { status: order.status },
      afterJson: { status: updated.status },
    });
    return updated;
  }

  /**
   * Apply enabled FulfillmentRules (provisional domain — not company-specific profit formulas).
   * - AUTO_APPROVE pending
   * - SUGGEST_CARRIER on shipment draft
   * - MARK_PENDING_PROCUREMENT if any line inventory < reorderPoint
   */
  async runRules(actorUserId?: string) {
    const rules = await this.prisma.fulfillmentRule.findMany({
      where: { enabled: true },
      orderBy: { priority: 'asc' },
    });
    const pending = await this.prisma.order.findMany({
      where: {
        status: {
          in: [
            'PENDING_REVIEW',
            'APPROVED',
            'PENDING_PROCUREMENT',
            'AWAITING_SHIPMENT',
          ],
        },
      },
      include: { lines: true, shipment: true },
    });

    const applied: Array<{ orderId: string; actions: string[] }> = [];

    for (const order of pending) {
      const actions: string[] = [];
      for (const rule of rules) {
        const cond = rule.conditionJson as Record<string, unknown>;
        const action = rule.actionJson as Record<string, unknown>;

        if (action.type === 'AUTO_APPROVE') {
          if (
            order.status === 'PENDING_REVIEW' &&
            (cond.status === 'PENDING_REVIEW' || !cond.status)
          ) {
            await this.prisma.order.update({
              where: { id: order.id },
              data: { status: 'APPROVED' },
            });
            order.status = 'APPROVED';
            actions.push(`AUTO_APPROVE:${rule.name}`);
          }
        }

        if (action.type === 'MARK_PENDING_PROCUREMENT' && cond.checkInventory) {
          let low = false;
          for (const line of order.lines) {
            const inv = await this.prisma.inventoryItem.findUnique({
              where: { productId: line.productId },
            });
            if (!inv || inv.qtyOnHand < inv.reorderPoint || inv.qtyOnHand < line.qty) {
              low = true;
              break;
            }
          }
          if (
            low &&
            (order.status === 'APPROVED' || order.status === 'PENDING_REVIEW')
          ) {
            await this.prisma.order.update({
              where: { id: order.id },
              data: { status: 'PENDING_PROCUREMENT' },
            });
            order.status = 'PENDING_PROCUREMENT';
            actions.push(`MARK_PENDING_PROCUREMENT:${rule.name}`);
          }
        }

        if (action.type === 'SUGGEST_CARRIER') {
          const statusIn = (cond.statusIn as string[] | undefined) ?? [
            'APPROVED',
            'AWAITING_SHIPMENT',
            'PENDING_PROCUREMENT',
          ];
          if (statusIn.includes(order.status)) {
            const carrier =
              (action.carrier as string) || 'INTERNAL_MOCK_CARRIER';
            await this.prisma.shipment.upsert({
              where: { orderId: order.id },
              create: { orderId: order.id, carrier },
              update: { carrier: order.shipment?.carrier ? undefined : carrier },
            });
            if (order.status === 'APPROVED') {
              await this.prisma.order.update({
                where: { id: order.id },
                data: { status: 'AWAITING_SHIPMENT' },
              });
              order.status = 'AWAITING_SHIPMENT';
            }
            actions.push(`SUGGEST_CARRIER:${rule.name}:${carrier}`);
          }
        }
      }

      if (actions.length) {
        await this.audit.log({
          actorUserId,
          action: 'ORDER_RUN_RULES',
          entityType: 'Order',
          entityId: order.id,
          afterJson: { actions },
        });
        applied.push({ orderId: order.id, actions });
      }
    }

    return { rulesApplied: rules.length, ordersTouched: applied.length, applied };
  }
}
