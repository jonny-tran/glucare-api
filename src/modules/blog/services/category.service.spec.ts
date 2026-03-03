import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CategoryRepository } from '../repositories/category.repository';
import { CategoryService } from './category.service';

describe('CategoryService', () => {
  let service: CategoryService;
  let repository: jest.Mocked<CategoryRepository>;

  const mockRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    restore: jest.fn(),
    countArticlesByCategoryId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        { provide: CategoryRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    repository = module.get(CategoryRepository);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a category successfully', async () => {
      const dto = { name: 'Dinh dưỡng', description: 'Chế độ ăn' };
      const created = {
        id: 'uuid',
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(result).toEqual(created);
    });

    it('should throw ConflictException if name already exists', async () => {
      const dto = { name: 'Dinh dưỡng' };
      mockRepository.findByName.mockResolvedValue({ id: 'existing' });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update a category', async () => {
      const category = { id: 'uuid', name: 'Old Name', deletedAt: null };
      const dto = { name: 'New Name' };
      const updated = { ...category, name: 'New Name' };
      mockRepository.findById.mockResolvedValue(category);
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.update.mockResolvedValue(updated);

      const result = await service.update('uuid', dto);

      expect(result.name).toBe('New Name');
    });

    it('should throw NotFoundException if category not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.update('uuid', { name: 'test' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if new name already exists', async () => {
      const category = { id: 'uuid-1', name: 'Old Name' };
      mockRepository.findById.mockResolvedValue(category);
      mockRepository.findByName.mockResolvedValue({
        id: 'uuid-2',
        name: 'Taken Name',
      });

      await expect(
        service.update('uuid-1', { name: 'Taken Name' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('softDelete', () => {
    it('should soft-delete a category', async () => {
      const category = { id: 'uuid', deletedAt: null };
      const deleted = { ...category, deletedAt: new Date() };
      mockRepository.findById.mockResolvedValue(category);
      mockRepository.softDelete.mockResolvedValue(deleted);

      const result = await service.softDelete('uuid');

      expect(result.deletedAt).toBeDefined();
    });

    it('should throw ConflictException if already deleted', async () => {
      const category = { id: 'uuid', deletedAt: new Date() };
      mockRepository.findById.mockResolvedValue(category);

      await expect(service.softDelete('uuid')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('restore', () => {
    it('should restore a soft-deleted category', async () => {
      const category = { id: 'uuid', deletedAt: new Date() };
      const restored = { ...category, deletedAt: null };
      mockRepository.findById.mockResolvedValue(category);
      mockRepository.restore.mockResolvedValue(restored);

      const result = await service.restore('uuid');

      expect(result.deletedAt).toBeNull();
    });

    it('should throw ConflictException if not deleted', async () => {
      const category = { id: 'uuid', deletedAt: null };
      mockRepository.findById.mockResolvedValue(category);

      await expect(service.restore('uuid')).rejects.toThrow(ConflictException);
    });
  });
});
