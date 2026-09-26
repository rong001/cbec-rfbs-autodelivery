import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  AdvanceListingDto,
  CreateListingDto,
  PublishListingDto,
} from './listings.dto';
import { ListingsService } from './listings.service';

@Controller('listings')
@UseGuards(JwtAuthGuard)
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Get()
  list(@Query('productId') productId?: string) {
    return this.listings.list(productId);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.listings.get(id);
  }

  @Post()
  create(
    @Body() dto: CreateListingDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.listings.create(dto, user.sub);
  }

  @Post(':id/advance')
  advance(
    @Param('id') id: string,
    @Body() dto: AdvanceListingDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.listings.advance(id, dto, user.sub);
  }

  @Post(':id/publish')
  publish(
    @Param('id') id: string,
    @Body() dto: PublishListingDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.listings.publish(id, dto, user.sub);
  }
}
