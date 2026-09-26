import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('live')
  live() {
    return { status: 'ok', ts: new Date().toISOString() };
  }

  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', db: 'up', ts: new Date().toISOString() };
    } catch (err) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        db: 'down',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
