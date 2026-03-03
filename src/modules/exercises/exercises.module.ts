import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { ExercisesController } from './exercises.controller';
import { ExercisesRepository } from './exercises.repository';
import { ExercisesService } from './exercises.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ExercisesController],
  providers: [ExercisesService, ExercisesRepository],
  exports: [ExercisesService, ExercisesRepository],
})
export class ExercisesModule {}
