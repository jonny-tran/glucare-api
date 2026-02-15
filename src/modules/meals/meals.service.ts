import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateMealDto } from './dto/create-meal.dto';
import { MealFilterDto, UpdateMealDto } from './dto/meal-filter.dto';
import { MealsRepository } from './meals.repository';

@Injectable()
export class MealsService {
  constructor(private readonly mealsRepository: MealsRepository) {}

  async create(userId: string, data: CreateMealDto) {
    return this.mealsRepository.create(userId, data);
  }

  async findAll(userId: string, query: MealFilterDto) {
    return this.mealsRepository.findAll(userId, query);
  }

  async findOne(id: string, userId: string) {
    const meal = await this.mealsRepository.findOne(id);
    if (!meal) throw new NotFoundException('Không tìm thấy bữa ăn');
    if (meal.userId !== userId)
      throw new BadRequestException('Bạn không có quyền truy cập dữ liệu này');
    return meal;
  }

  async update(id: string, userId: string, data: UpdateMealDto) {
    await this.findOne(id, userId);
    return this.mealsRepository.update(id, userId, data);
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.mealsRepository.softDelete(id, userId);
  }
}
