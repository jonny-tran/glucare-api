import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryFilterDto } from '../dto/category-filter.dto';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { CategoryRepository } from '../repositories/category.repository';

@Injectable()
export class CategoryService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async findAll(query: CategoryFilterDto) {
    return this.categoryRepository.findAll(query);
  }

  async findById(id: string) {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }
    return category;
  }

  async create(dto: CreateCategoryDto) {
    // Kiểm tra trùng tên
    const existing = await this.categoryRepository.findByName(dto.name);
    if (existing) {
      throw new ConflictException('Tên danh mục đã tồn tại');
    }

    return this.categoryRepository.create(dto);
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    // Kiểm tra trùng tên nếu đổi tên
    if (dto.name && dto.name !== category.name) {
      const existing = await this.categoryRepository.findByName(dto.name);
      if (existing) {
        throw new ConflictException('Tên danh mục đã tồn tại');
      }
    }

    return this.categoryRepository.update(id, dto);
  }

  async softDelete(id: string) {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    if (category.deletedAt) {
      throw new ConflictException('Danh mục đã bị xóa trước đó');
    }

    const deleted = await this.categoryRepository.softDelete(id);
    if (!deleted) {
      throw new NotFoundException('Không thể xóa danh mục');
    }
    return deleted;
  }

  async restore(id: string) {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    if (!category.deletedAt) {
      throw new ConflictException('Danh mục chưa bị xóa, không cần khôi phục');
    }

    const restored = await this.categoryRepository.restore(id);
    if (!restored) {
      throw new NotFoundException('Không thể khôi phục danh mục');
    }
    return restored;
  }
}
