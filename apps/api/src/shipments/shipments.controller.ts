import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { LabelShipmentDto } from './shipments.dto';
import { ShipmentsService } from './shipments.service';

@Controller('shipments')
@UseGuards(JwtAuthGuard)
export class ShipmentsController {
  constructor(private readonly shipments: ShipmentsService) {}

  @Get()
  list() {
    return this.shipments.list();
  }

  @Get('by-order/:orderId')
  getByOrder(@Param('orderId') orderId: string) {
    return this.shipments.getByOrder(orderId);
  }

  @Post(':orderId/label')
  label(
    @Param('orderId') orderId: string,
    @Body() dto: LabelShipmentDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.shipments.label(orderId, dto, user.sub);
  }

  @Post(':orderId/ship')
  ship(
    @Param('orderId') orderId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.shipments.ship(orderId, user.sub);
  }
}
