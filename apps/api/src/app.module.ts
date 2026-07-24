import { Module } from '@nestjs/common';
import { MaterialsModule } from './materials/materials.module';
import { CalculateModule } from './calculate/calculate.module';
import { ReportsModule } from './reports/reports.module';
import { HealthController } from './health.controller';
import { RootController } from './root.controller';
import { PrismaService } from './prisma.service';

@Module({
  imports: [MaterialsModule, CalculateModule, ReportsModule],
  controllers: [RootController, HealthController],
  providers: [PrismaService],
})
export class AppModule {}
