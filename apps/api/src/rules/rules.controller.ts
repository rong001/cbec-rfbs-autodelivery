import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateRuleDto, SetEnabledDto, UpdateRuleDto } from './rules.dto';
import { RulesService } from './rules.service';

@Controller('rules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RulesController {
  constructor(private readonly rules: RulesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  list() {
    return this.rules.list();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  get(@Param('id') id: string) {
    return this.rules.get(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(
    @Body() dto: CreateRuleDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.rules.create(dto, user.sub);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRuleDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.rules.update(id, dto, user.sub);
  }

  @Patch(':id/enabled')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  setEnabled(
    @Param('id') id: string,
    @Body() dto: SetEnabledDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.rules.setEnabled(id, dto.enabled, user.sub);
  }
}
