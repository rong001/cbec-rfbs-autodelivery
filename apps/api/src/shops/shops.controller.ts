import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateShopDto } from './shops.dto';
import { ShopsService } from './shops.service';

@Controller('shops')
@UseGuards(JwtAuthGuard)
export class ShopsController {
  constructor(private readonly shops: ShopsService) {}

  @Get()
  list() {
    return this.shops.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.shops.get(id);
  }

  @Post()
  create(
    @Body() dto: CreateShopDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.shops.create(dto, user.sub);
  }
}
