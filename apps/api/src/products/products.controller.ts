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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  ClaimFromSelectionDto,
  CreateProductDto,
  UpdateProductDto,
} from './products.dto';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(@Query('shopId') shopId?: string) {
    return this.products.list(shopId);
  }

  @Post('claim-from-selection')
  claim(
    @Body() dto: ClaimFromSelectionDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.products.claimFromSelection(dto, user.sub);
  }

  @Post()
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.products.create(dto, user.sub);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.products.get(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.products.update(id, dto, user.sub);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.products.remove(id, user.sub);
  }
}
