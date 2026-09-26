import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateOrderDto } from './orders.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list() {
    return this.orders.list();
  }

  @Post('run-rules')
  runRules(@CurrentUser() user: { sub: string }) {
    return this.orders.runRules(user.sub);
  }

  @Post()
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.orders.create(dto, user.sub);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.orders.get(id);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.orders.approve(id, user.sub);
  }
}
