import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { JwtAuthGuard, RolesGuard } from './common/guards';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { OrdersModule } from './orders/orders.module';
import { ProductionModule } from './production/production.module';
import { WeightModule } from './weight/weight.module';
import { QCModule } from './qc/qc.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UsersModule } from './users/users.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { InventoryModule } from './inventory/inventory.module';
import { ReportsModule } from './reports/reports.module';
import { EmployeesModule } from './employees/employees.module';
import { AutomationModule } from './automation/automation.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    OrdersModule,
    ProductionModule,
    WeightModule,
    QCModule,
    DashboardModule,
    AttachmentsModule,
    InventoryModule,
    ReportsModule,
    EmployeesModule,
    AutomationModule,
  ],
  providers: [
    // Bảo mật mặc định: mọi route cần JWT (trừ @Public) + kiểm soát vai trò.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
