import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BalancesModule } from './balances/balances.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { MockHcmModule } from './mock-hcm/mock-hcm.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    HealthModule,
    MockHcmModule,
    BalancesModule,
  ],
})
export class AppModule {}
