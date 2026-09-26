import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
  ClaimFromSelectionDto,
  CreateProductDto,
  UpdateProductDto,
} from './products.dto';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  list(@Query('shopId') shopId?: string) {
    return this.products.list(shopId);
  }

  @Post('claim-from-selection')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  claim(
    @Body() dto: ClaimFromSelectionDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.products.claimFromSelection(dto, user.sub);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.products.create(dto, user.sub);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  get(@Param('id') id: string) {
    return this.products.get(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.products.update(id, dto, user.sub);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  remove(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.products.remove(id, user.sub);
  }
}
