import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MealsRepository } from './meals.repository';
import { MealsService } from './meals.service';

const mockMealsRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
};

describe('MealsService', () => {
  let service: MealsService;
  let repository: typeof mockMealsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MealsService,
        {
          provide: MealsRepository,
          useValue: mockMealsRepository,
        },
      ],
    }).compile();

    service = module.get<MealsService>(MealsService);
    repository = module.get(MealsRepository);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a meal', async () => {
      const dto = {
        foodName: 'Phở',
        mealType: 'BREAKFAST' as const,
        recordedAt: '2026-02-15T10:00:00Z',
      };
      const userId = 'user-1';
      const expectedResult = { id: 'meal-1', ...dto, userId };

      mockMealsRepository.create.mockResolvedValue(expectedResult);

      const result = await service.create(userId, dto);
      expect(result).toEqual(expectedResult);
      expect(repository.create).toHaveBeenCalledWith(userId, dto);
    });
  });

  describe('findAll', () => {
    it('should return paginated meals', async () => {
      const query = { page: 1, limit: 10 };
      const userId = 'user-1';
      const expectedResult = {
        data: [],
        meta: { total: 0, page: 1, limit: 10, lastPage: 0 },
      };

      mockMealsRepository.findAll.mockResolvedValue(expectedResult);

      const result = await service.findAll(userId, query);
      expect(result).toEqual(expectedResult);
      expect(repository.findAll).toHaveBeenCalledWith(userId, query);
    });
  });

  describe('findOne', () => {
    it('should return a meal if owned by user', async () => {
      const mealId = 'meal-1';
      const userId = 'user-1';
      const meal = { id: mealId, userId };

      mockMealsRepository.findOne.mockResolvedValue(meal);

      const result = await service.findOne(mealId, userId);
      expect(result).toEqual(meal);
    });

    it('should throw NotFoundException if meal not found', async () => {
      mockMealsRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('meal-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if meal belongs to another user', async () => {
      const meal = { id: 'meal-1', userId: 'other-user' };
      mockMealsRepository.findOne.mockResolvedValue(meal);
      await expect(service.findOne('meal-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    it('should update a meal if owned by user', async () => {
      const mealId = 'meal-1';
      const userId = 'user-1';
      const dto = { foodName: 'Bún' };
      const existingMeal = { id: mealId, userId, foodName: 'Phở' };
      const updatedMeal = { ...existingMeal, ...dto };

      mockMealsRepository.findOne.mockResolvedValue(existingMeal);
      mockMealsRepository.update.mockResolvedValue(updatedMeal);

      const result = await service.update(mealId, userId, dto);
      expect(result).toEqual(updatedMeal);
      expect(repository.update).toHaveBeenCalledWith(mealId, userId, dto);
    });

    it('should check ownership before update', async () => {
      const mealId = 'meal-1';
      const userId = 'user-1';
      const dto = { foodName: 'Bún' };

      // Mock findOne to throw (simulate ownership failure or not found)
      // Here we rely on service.findOne implementation
      mockMealsRepository.findOne.mockResolvedValue({
        id: mealId,
        userId: 'other',
      });

      await expect(service.update(mealId, userId, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete a meal if owned by user', async () => {
      const mealId = 'meal-1';
      const userId = 'user-1';
      const existingMeal = { id: mealId, userId };

      mockMealsRepository.findOne.mockResolvedValue(existingMeal);
      mockMealsRepository.softDelete.mockResolvedValue(existingMeal);

      const result = await service.remove(mealId, userId);
      expect(result).toEqual(existingMeal);
      expect(repository.softDelete).toHaveBeenCalledWith(mealId, userId);
    });

    it('should check ownership before delete', async () => {
      const mealId = 'meal-1';
      const userId = 'user-1';

      mockMealsRepository.findOne.mockResolvedValue({
        id: mealId,
        userId: 'other',
      });

      await expect(service.remove(mealId, userId)).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.softDelete).not.toHaveBeenCalled();
    });
  });
});
