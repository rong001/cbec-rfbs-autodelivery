import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateOrderDto } from './orders.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  list() {
    return this.orders.list();
  }

  @Post('run-rules')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  runRules(@CurrentUser() user: { sub: string }) {
    return this.orders.runRules(user.sub);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.orders.create(dto, user.sub);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  get(@Param('id') id: string) {
    return this.orders.get(id);
  }

  @Post(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  approve(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.orders.approve(id, user.sub);
  }
}
