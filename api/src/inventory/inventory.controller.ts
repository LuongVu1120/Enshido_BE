import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@enshido/types';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { InventoryService } from './inventory.service';
import {
  IssueDto,
  ReceiptDto,
  StockInFgDto,
  TransferDto,
  UpsertItemDto,
  UpsertSupplierDto,
} from './dto';

// Nghiệp vụ kho: vai trò Kho thao tác; Admin/Quản lý/Kế toán xem (RBAC — Hiến pháp I).
const VIEW = [Role.WAREHOUSE, Role.PRODUCTION_MANAGER, Role.ACCOUNTANT];
const WRITE = [Role.WAREHOUSE];

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private service: InventoryService) {}

  // Items
  @Get('items')
  @Roles(...VIEW)
  listItems(
    @Query('q') q?: string,
    @Query('group') group?: string,
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return this.service.listItems({ q, group, status, supplierId, page: Number(page), pageSize: Number(pageSize) });
  }

  @Get('items/:id')
  @Roles(...VIEW)
  getItem(@Param('id') id: string) {
    return this.service.getItem(id);
  }

  @Post('items')
  @Roles(...WRITE)
  createItem(@Body() dto: UpsertItemDto, @CurrentUser() user: AuthUser) {
    return this.service.createItem(dto, user);
  }

  @Put('items/:id')
  @Roles(...WRITE)
  updateItem(@Param('id') id: string, @Body() dto: UpsertItemDto, @CurrentUser() user: AuthUser) {
    return this.service.updateItem(id, dto, user);
  }

  // Suppliers
  @Get('suppliers')
  @Roles(...VIEW)
  listSuppliers(@Query('q') q?: string) {
    return this.service.listSuppliers(q);
  }

  @Post('suppliers')
  @Roles(...WRITE)
  createSupplier(@Body() dto: UpsertSupplierDto, @CurrentUser() user: AuthUser) {
    return this.service.createSupplier(dto, user);
  }

  // Giao dịch
  @Post('receipts')
  @Roles(...WRITE)
  receipt(@Body() dto: ReceiptDto, @CurrentUser() user: AuthUser) {
    return this.service.receipt(dto, user);
  }

  @Post('issues')
  @Roles(Role.WAREHOUSE, Role.PRODUCTION_MANAGER)
  issue(@Body() dto: IssueDto, @CurrentUser() user: AuthUser) {
    return this.service.issue(dto, user);
  }

  @Post('transfers')
  @Roles(...WRITE)
  transfer(@Body() dto: TransferDto, @CurrentUser() user: AuthUser) {
    return this.service.transfer(dto, user);
  }

  @Get('transactions')
  @Roles(...VIEW)
  transactions(
    @Query('inventoryItemId') inventoryItemId?: string,
    @Query('orderId') orderId?: string,
    @Query('type') type?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '30',
  ) {
    return this.service.listTransactions({ inventoryItemId, orderId, type, page: Number(page), pageSize: Number(pageSize) });
  }

  // Thành phẩm
  @Get('finished-goods/pending')
  @Roles(Role.WAREHOUSE, Role.PRODUCTION_MANAGER)
  pendingFg() {
    return this.service.pendingFinishedGoods();
  }

  @Post('finished-goods/stock-in')
  @Roles(...WRITE)
  stockInFg(@Body() dto: StockInFgDto, @CurrentUser() user: AuthUser) {
    return this.service.stockInFinishedGoods(dto, user);
  }

  // Cảnh báo & định giá
  @Get('alerts')
  @Roles(...VIEW)
  alerts() {
    return this.service.alerts();
  }

  @Get('valuation')
  @Roles(Role.WAREHOUSE, Role.PRODUCTION_MANAGER, Role.ACCOUNTANT)
  valuation() {
    return this.service.valuation();
  }

  @Get('summary')
  @Roles(...VIEW)
  summary() {
    return this.service.summary();
  }
}
