import { IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { ListingStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateListingDto {
  @IsString()
  productId!: string;

  @IsString()
  @MinLength(1)
  titleRu!: string;
}

export class AdvanceListingDto {
  @IsEnum(ListingStatus)
  status!: ListingStatus;
}

export class PublishListingDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  initialQty?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reorderPoint?: number;
}
