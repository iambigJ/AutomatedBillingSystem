import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsPositive,
  IsArray,
  ValidateNested,
  IsOptional,
  IsDateString,
  MinLength,
  ArrayMinSize,
} from 'class-validator';

export class InvoiceItemDto {
  @IsString()
  @MinLength(1)
  sku: string;

  @IsNumber()
  @IsPositive()
  qt: number;
}

export class CreateInvoiceDto {
  @IsString()
  @MinLength(1)
  customer: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @MinLength(1)
  reference: string;

  @IsOptional()
  @IsDateString()
  date?: Date;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}
