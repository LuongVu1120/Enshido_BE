import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@enshido/types';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { CustomersService } from './customers.service';

class UpsertCustomerDto {
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() channel?: string;
  @IsOptional() @IsString() customerType?: string;
  @IsOptional() @IsString() note?: string;
}

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(private service: CustomersService) {}

  @Get()
  @Roles(Role.PRODUCTION_MANAGER, Role.ACCOUNTANT, Role.QC, Role.WAREHOUSE)
  list(@Query('q') q?: string, @Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    return this.service.list(q, Number(page), Number(pageSize));
  }

  @Get(':id')
  @Roles(Role.PRODUCTION_MANAGER, Role.ACCOUNTANT)
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  @Get(':id/orders')
  @Roles(Role.PRODUCTION_MANAGER, Role.ACCOUNTANT)
  orders(@Param('id') id: string) {
    return this.service.orders(id);
  }

  @Post()
  @Roles(Role.PRODUCTION_MANAGER)
  create(@Body() dto: UpsertCustomerDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Put(':id')
  @Roles(Role.PRODUCTION_MANAGER)
  update(@Param('id') id: string, @Body() dto: UpsertCustomerDto, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto, user);
  }
}
