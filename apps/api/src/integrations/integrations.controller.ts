import {
  BadRequestException,
  Controller,
  Get,
  NotImplementedException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IntegrationsService } from './integrations.service';

@Controller('integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get('status')
  status() {
    return this.integrations.status();
  }

  @Post('ozon/test-read')
  async testOzonRead() {
    const result = await this.integrations.testOzonRead();

    if (!result.configured) {
      throw new BadRequestException(result);
    }

    if (result.httpStatus === 501) {
      throw new NotImplementedException(result);
    }

    return result;
  }
}
