import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ArticleRepository } from '../repositories/article.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { ArticleAdminService } from './article-admin.service';

describe('ArticleAdminService', () => {
  let service: ArticleAdminService;

  const mockArticleRepository = {
    findAllForAdmin: jest.fn(),
    findByIdForAdmin: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updatePublishStatus: jest.fn(),
    softDelete: jest.fn(),
    restore: jest.fn(),
  };

  const mockCategoryRepository = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleAdminService,
        { provide: ArticleRepository, useValue: mockArticleRepository },
        { provide: CategoryRepository, useValue: mockCategoryRepository },
      ],
    }).compile();

    service = module.get<ArticleAdminService>(ArticleAdminService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an article when category exists', async () => {
      const dto = {
        title: 'Test Article',
        content: 'Test content',
        categoryId: 'cat-uuid',
        language: 'VI' as const,
      };
      const category = { id: 'cat-uuid', name: 'Test' };
      const created = { id: 'art-uuid', ...dto, isPublished: false };

      mockCategoryRepository.findById.mockResolvedValue(category);
      mockArticleRepository.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(result.isPublished).toBe(false);
      expect(mockCategoryRepository.findById).toHaveBeenCalledWith('cat-uuid');
    });

    it('should throw NotFoundException when category not found', async () => {
      const dto = {
        title: 'Test',
        content: 'Content',
        categoryId: 'nonexist',
        language: 'VI' as const,
      };
      mockCategoryRepository.findById.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('publishToggle', () => {
    it('should toggle publish status', async () => {
      const article = { id: 'art-uuid', isPublished: false };
      const updated = { ...article, isPublished: true };
      mockArticleRepository.findByIdForAdmin.mockResolvedValue(article);
      mockArticleRepository.updatePublishStatus.mockResolvedValue(updated);

      const result = await service.publishToggle('art-uuid', true);

      expect(result.isPublished).toBe(true);
    });

    it('should throw NotFoundException when article not found', async () => {
      mockArticleRepository.findByIdForAdmin.mockResolvedValue(null);

      await expect(service.publishToggle('nonexist', true)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('softDelete', () => {
    it('should soft-delete an article', async () => {
      const article = { id: 'art-uuid' };
      const deleted = { ...article, deletedAt: new Date() };
      mockArticleRepository.findByIdForAdmin.mockResolvedValue(article);
      mockArticleRepository.softDelete.mockResolvedValue(deleted);

      const result = await service.softDelete('art-uuid');

      expect(result.deletedAt).toBeDefined();
    });
  });
});
