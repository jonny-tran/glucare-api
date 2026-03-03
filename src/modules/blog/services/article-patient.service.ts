import { Injectable, NotFoundException } from '@nestjs/common';
import { PatientArticleFilterDto } from '../dto/patient-article-filter.dto';
import { ArticleRepository } from '../repositories/article.repository';

@Injectable()
export class ArticlePatientService {
  constructor(private readonly articleRepository: ArticleRepository) {}

  async findAll(query: PatientArticleFilterDto) {
    return this.articleRepository.findAllForPatient(query);
  }

  async findById(id: string) {
    const article = await this.articleRepository.findByIdForPatient(id);
    if (!article) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    // Side-effect: Tăng viewCount bất đồng bộ (non-blocking)
    void this.articleRepository.incrementViewCount(id);

    return article;
  }
}
