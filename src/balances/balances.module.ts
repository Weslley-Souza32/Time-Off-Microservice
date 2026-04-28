import { Module } from '@nestjs/common';
import { MockHcmModule } from '../mock-hcm/mock-hcm.module';
import { BalancesController } from './balances.controller';
import { BalancesService } from './balances.service';

@Module({
  imports: [MockHcmModule],
  controllers: [BalancesController],
  providers: [BalancesService],
})
export class BalancesModule {}
