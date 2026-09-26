import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IntegrationsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.prisma.integrationCredential.upsert({
      where: { provider: 'OZON' },
      create: {
        provider: 'OZON',
        status: 'NOT_CONFIGURED',
        metaJson: {
          note: 'No Ozon Client-Id / Api-Key injected. Live platform calls blocked.',
          mode: process.env.OZON_MODE || 'NOT_CONFIGURED',
        },
      },
      update: {},
    });
  }

  async status() {
    const rows = await this.prisma.integrationCredential.findMany();
    return {
      integrations: rows.map((r) => ({
        provider: r.provider,
        status: r.status,
        meta: r.metaJson,
        updatedAt: r.updatedAt,
      })),
      honesty: {
        ozonLive: false,
        secretsInDb: false,
        message:
          'Ozon is NOT_CONFIGURED. Closed-loop uses local Postgres + synthetic data only.',
      },
    };
  }
}
