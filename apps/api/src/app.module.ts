import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { ShopsModule } from './shops/shops.module';
import { ProductsModule } from './products/products.module';
import { ListingsModule } from './listings/listings.module';
import { InventoryModule } from './inventory/inventory.module';
import { OrdersModule } from './orders/orders.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { RulesModule } from './rules/rules.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    AuthModule,
    AuditModule,
    ShopsModule,
    ProductsModule,
    ListingsModule,
    InventoryModule,
    OrdersModule,
    ShipmentsModule,
    IntegrationsModule,
    RulesModule,
    UsersModule,
  ],
})
export class AppModule {}
