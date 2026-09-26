import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { LabelShipmentDto } from './shipments.dto';
import { ShipmentsService } from './shipments.service';

@Controller('shipments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShipmentsController {
  constructor(private readonly shipments: ShipmentsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  list() {
    return this.shipments.list();
  }

  @Get('by-order/:orderId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  getByOrder(@Param('orderId') orderId: string) {
    return this.shipments.getByOrder(orderId);
  }

  @Post(':orderId/label')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  label(
    @Param('orderId') orderId: string,
    @Body() dto: LabelShipmentDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.shipments.label(orderId, dto, user.sub);
  }

  @Post(':orderId/ship')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  ship(
    @Param('orderId') orderId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.shipments.ship(orderId, user.sub);
  }
}
