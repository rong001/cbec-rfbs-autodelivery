import { IsOptional, IsString } from 'class-validator';

export class LabelShipmentDto {
  @IsOptional()
  @IsString()
  carrier?: string;
}
