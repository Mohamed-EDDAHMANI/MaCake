import { IsNumber, IsString, IsArray, ArrayNotEmpty, ValidateNested, IsOptional, IsIn, IsDateString } from "class-validator";
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from "./create-order-item.dto";

export class CreateOrderDto {
	@IsString()
	clientId: string;

	@IsString()
	patissiereId: string;

	@IsString()
	patissiereAddress: string;

	@IsString()
	deliveryAddress: string;

	@IsString()
	@IsIn(['profile', 'current_location'])
	deliveryAddressSource: 'profile' | 'current_location';

	@IsOptional()
	@IsNumber()
	deliveryLatitude?: number;

	@IsOptional()
	@IsNumber()
	deliveryLongitude?: number;

	@IsOptional()
	@IsNumber()
	patissiereLatitude?: number;

	@IsOptional()
	@IsNumber()
	patissiereLongitude?: number;

	@IsDateString()
	requestedDateTime: string;

	@IsNumber()
	@IsOptional()
	totalPrice?: number;

	@IsArray()
	@ArrayNotEmpty()
	@ValidateNested({ each: true })
	@Type(() => CreateOrderItemDto)
	items: CreateOrderItemDto[];
}
