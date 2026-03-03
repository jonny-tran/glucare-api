import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminArticleFilterDto } from '../dto/admin-article-filter.dto';
import { CreateArticleDto } from '../dto/create-article.dto';
import { UpdateArticleDto } from '../dto/update-article.dto';
import { ArticleRepository } from '../repositories/article.repository';
import { CategoryRepository } from '../repositories/category.repository';

@Injectable()
export class ArticleAdminService {
  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async findAll(query: AdminArticleFilterDto) {
    return this.articleRepository.findAllForAdmin(query);
  }

  async findById(id: string) {
    const article = await this.articleRepository.findByIdForAdmin(id);
    if (!article) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }
    return article;
  }

  async create(dto: CreateArticleDto) {
    // Kiểm tra category tồn tại
    const category = await this.categoryRepository.findById(dto.categoryId);
    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    return this.articleRepository.create(dto);
  }

  async update(id: string, dto: UpdateArticleDto) {
    const article = await this.articleRepository.findByIdForAdmin(id);
    if (!article) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    // Kiểm tra category nếu đổi
    if (dto.categoryId) {
      const category = await this.categoryRepository.findById(dto.categoryId);
      if (!category) {
        throw new NotFoundException('Không tìm thấy danh mục');
      }
    }

    return this.articleRepository.update(id, dto);
  }

  async publishToggle(id: string, isPublished: boolean) {
    const article = await this.articleRepository.findByIdForAdmin(id);
    if (!article) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    return this.articleRepository.updatePublishStatus(id, isPublished);
  }

  async softDelete(id: string) {
    const article = await this.articleRepository.findByIdForAdmin(id);
    if (!article) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    const deleted = await this.articleRepository.softDelete(id);
    if (!deleted) {
      throw new NotFoundException('Bài viết đã bị xóa trước đó');
    }
    return deleted;
  }

  async restore(id: string) {
    const article = await this.articleRepository.findByIdForAdmin(id);
    if (!article) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    return this.articleRepository.restore(id);
  }
}
