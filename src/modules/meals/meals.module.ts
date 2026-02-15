import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { MealsController } from './meals.controller';
import { MealsRepository } from './meals.repository';
import { MealsService } from './meals.service';

@Module({
  imports: [DatabaseModule],
  controllers: [MealsController],
  providers: [MealsService, MealsRepository],
  exports: [MealsService, MealsRepository],
})
export class MealsModule {}
