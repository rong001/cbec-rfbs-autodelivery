import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateRuleDto, UpdateRuleDto } from './rules.dto';

const DEFAULT_RULES: Array<{
  name: string;
  enabled: boolean;
  priority: number;
  conditionJson: Prisma.InputJsonValue;
  actionJson: Prisma.InputJsonValue;
}> = [
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
];

@Injectable()
export class RulesService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultRules();
  }

  /**
   * Seed known defaults by name — never duplicates existing rows.
   */
  async ensureDefaultRules() {
    for (const rule of DEFAULT_RULES) {
      const existing = await this.prisma.fulfillmentRule.findFirst({
        where: { name: rule.name },
      });
      if (existing) continue;
      await this.prisma.fulfillmentRule.create({ data: rule });
    }
  }

  list() {
    return this.prisma.fulfillmentRule.findMany({
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async get(id: string) {
    const rule = await this.prisma.fulfillmentRule.findUnique({
      where: { id },
    });
    if (!rule) throw new NotFoundException('Rule not found');
    return rule;
  }

  async create(dto: CreateRuleDto, actorUserId?: string) {
    const dup = await this.prisma.fulfillmentRule.findFirst({
      where: { name: dto.name },
    });
    if (dup) {
      throw new BadRequestException(`Rule name already exists: ${dto.name}`);
    }
    const rule = await this.prisma.fulfillmentRule.create({
      data: {
        name: dto.name,
        enabled: dto.enabled ?? true,
        priority: dto.priority ?? 100,
        conditionJson: dto.conditionJson as Prisma.InputJsonValue,
        actionJson: dto.actionJson as Prisma.InputJsonValue,
      },
    });
    await this.audit.log({
      actorUserId,
      action: 'RULE_CREATE',
      entityType: 'FulfillmentRule',
      entityId: rule.id,
      afterJson: rule as object,
    });
    return rule;
  }

  async update(id: string, dto: UpdateRuleDto, actorUserId?: string) {
    const before = await this.get(id);
    if (dto.name && dto.name !== before.name) {
      const dup = await this.prisma.fulfillmentRule.findFirst({
        where: { name: dto.name },
      });
      if (dup) {
        throw new BadRequestException(`Rule name already exists: ${dto.name}`);
      }
    }
    const data: Prisma.FulfillmentRuleUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.enabled !== undefined) data.enabled = dto.enabled;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.conditionJson !== undefined) {
      data.conditionJson = dto.conditionJson as Prisma.InputJsonValue;
    }
    if (dto.actionJson !== undefined) {
      data.actionJson = dto.actionJson as Prisma.InputJsonValue;
    }
    const rule = await this.prisma.fulfillmentRule.update({
      where: { id },
      data,
    });
    await this.audit.log({
      actorUserId,
      action: 'RULE_UPDATE',
      entityType: 'FulfillmentRule',
      entityId: id,
      beforeJson: before as object,
      afterJson: rule as object,
    });
    return rule;
  }

  async setEnabled(id: string, enabled: boolean, actorUserId?: string) {
    const before = await this.get(id);
    const rule = await this.prisma.fulfillmentRule.update({
      where: { id },
      data: { enabled },
    });
    await this.audit.log({
      actorUserId,
      action: enabled ? 'RULE_ENABLE' : 'RULE_DISABLE',
      entityType: 'FulfillmentRule',
      entityId: id,
      beforeJson: { enabled: before.enabled },
      afterJson: { enabled: rule.enabled },
    });
    return rule;
  }
}
