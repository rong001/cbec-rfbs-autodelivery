import { Injectable, OnModuleInit } from '@nestjs/common';
import { IntegrationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OzonAdapter } from './ozon/ozon.adapter';

@Injectable()
export class IntegrationsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ozon: OzonAdapter,
  ) {}

  async onModuleInit() {
    await this.syncOzonCredentialStatus();
  }

  async status() {
    // Re-syncing here also prevents a stale DB row from claiming authorization
    // after credentials have been removed from the process environment.
    await this.syncOzonCredentialStatus();
    const rows = await this.prisma.integrationCredential.findMany();
    const ozonStatus = this.ozon.getStatus();

    return {
      integrations: rows.map((r) => ({
        provider: r.provider,
        status: r.status,
        meta: r.metaJson,
        updatedAt: r.updatedAt,
      })),
      honesty: {
        ozonLive: ozonStatus.live,
        secretsInDb: false,
        message: ozonStatus.message,
      },
    };
  }

  async testOzonRead() {
    return this.ozon.listOrdersPage();
  }

  private async syncOzonCredentialStatus() {
    const ozonStatus = this.ozon.getStatus();
    const status = ozonStatus.status as IntegrationStatus;

    await this.prisma.integrationCredential.upsert({
      where: { provider: 'OZON' },
      create: {
        provider: 'OZON',
        status,
        metaJson: this.ozonMeta(ozonStatus),
      },
      update: {
        status,
        metaJson: this.ozonMeta(ozonStatus),
      },
    });
  }

  private ozonMeta(status: ReturnType<OzonAdapter['getStatus']>) {
    return {
      configured: status.configured,
      live: status.live,
      mode: status.mode,
      note: status.message,
      sellerApiBaseUrl: 'https://api-seller.ozon.ru',
    };
  }
}
