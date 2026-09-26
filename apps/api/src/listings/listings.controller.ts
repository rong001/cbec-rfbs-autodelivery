import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  AdvanceListingDto,
  CreateListingDto,
  PublishListingDto,
} from './listings.dto';
import { ListingsService } from './listings.service';

@Controller('listings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  list(@Query('productId') productId?: string) {
    return this.listings.list(productId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  get(@Param('id') id: string) {
    return this.listings.get(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  create(
    @Body() dto: CreateListingDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.listings.create(dto, user.sub);
  }

  @Post(':id/advance')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  advance(
    @Param('id') id: string,
    @Body() dto: AdvanceListingDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.listings.advance(id, dto, user.sub);
  }

  @Post(':id/publish')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  publish(
    @Param('id') id: string,
    @Body() dto: PublishListingDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.listings.publish(id, dto, user.sub);
  }
}
