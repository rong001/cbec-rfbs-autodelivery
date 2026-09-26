import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { OzonAdapter } from './ozon/ozon.adapter';

@Module({
  controllers: [IntegrationsController],
  providers: [IntegrationsService, OzonAdapter],
})
export class IntegrationsModule {}
