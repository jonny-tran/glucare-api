import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { ArticleAdminController } from './controllers/article-admin.controller';
import { ArticlePatientController } from './controllers/article-patient.controller';
import { CategoryController } from './controllers/category.controller';
import { ArticleRepository } from './repositories/article.repository';
import { CategoryRepository } from './repositories/category.repository';
import { ArticleAdminService } from './services/article-admin.service';
import { ArticlePatientService } from './services/article-patient.service';
import { CategoryService } from './services/category.service';

@Module({
  imports: [DatabaseModule],
  controllers: [
    CategoryController,
    ArticleAdminController,
    ArticlePatientController,
  ],
  providers: [
    CategoryService,
    ArticleAdminService,
    ArticlePatientService,
    CategoryRepository,
    ArticleRepository,
  ],
  exports: [ArticleRepository],
})
export class BlogModule {}
