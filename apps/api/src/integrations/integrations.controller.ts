import {
  BadRequestException,
  Controller,
  Get,
  NotImplementedException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { IntegrationsService } from './integrations.service';

@Controller('integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get('status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  status() {
    return this.integrations.status();
  }

  @Post('ozon/test-read')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
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
