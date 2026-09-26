import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ShopPlatform, ShopStatus } from '@prisma/client';

export class CreateShopDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsEnum(ShopPlatform)
  platform?: ShopPlatform;

  @IsOptional()
  @IsString()
  externalShopId?: string;

  @IsOptional()
  @IsEnum(ShopStatus)
  status?: ShopStatus;
}
