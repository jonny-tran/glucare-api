import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MedicationsRepository } from './medications.repository';
import { MedicationsService } from './medications.service';

const mockMedicationsRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
};

describe('MedicationsService', () => {
  let service: MedicationsService;
  let repository: typeof mockMedicationsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicationsService,
        {
          provide: MedicationsRepository,
          useValue: mockMedicationsRepository,
        },
      ],
    }).compile();

    service = module.get<MedicationsService>(MedicationsService);
    repository = module.get(MedicationsRepository);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a medication log', async () => {
      const dto = {
        medicineName: 'Metformin',
        dosage: 500,
        unit: 'mg',
        recordedAt: '2026-02-15T10:00:00Z',
      };
      const userId = 'user-1';
      const expectedResult = { id: 'med-1', ...dto, userId };

      mockMedicationsRepository.create.mockResolvedValue(expectedResult);

      const result = await service.create(userId, dto);
      expect(result).toEqual(expectedResult);
      expect(repository.create).toHaveBeenCalledWith(userId, dto);
    });
  });

  describe('findAll', () => {
    it('should return paginated medication logs', async () => {
      const query = { page: 1, limit: 10 };
      const userId = 'user-1';
      const expectedResult = {
        data: [],
        meta: { total: 0, page: 1, limit: 10, lastPage: 0 },
      };

      mockMedicationsRepository.findAll.mockResolvedValue(expectedResult);

      const result = await service.findAll(userId, query);
      expect(result).toEqual(expectedResult);
      expect(repository.findAll).toHaveBeenCalledWith(userId, query);
    });
  });

  describe('findOne', () => {
    it('should return a medication log if owned by user', async () => {
      const medId = 'med-1';
      const userId = 'user-1';
      const med = { id: medId, userId };

      mockMedicationsRepository.findOne.mockResolvedValue(med);

      const result = await service.findOne(medId, userId);
      expect(result).toEqual(med);
    });

    it('should throw NotFoundException if medication not found', async () => {
      mockMedicationsRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('med-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if medication belongs to another user', async () => {
      const med = { id: 'med-1', userId: 'other-user' };
      mockMedicationsRepository.findOne.mockResolvedValue(med);
      await expect(service.findOne('med-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    it('should update a medication log if owned by user', async () => {
      const medId = 'med-1';
      const userId = 'user-1';
      const dto = { medicineName: 'Glucophage' };
      const existingMed = { id: medId, userId, medicineName: 'Metformin' };
      const updatedMed = { ...existingMed, ...dto };

      mockMedicationsRepository.findOne.mockResolvedValue(existingMed);
      mockMedicationsRepository.update.mockResolvedValue(updatedMed);

      const result = await service.update(medId, userId, dto);
      expect(result).toEqual(updatedMed);
      expect(repository.update).toHaveBeenCalledWith(medId, userId, dto);
    });

    it('should check ownership before update', async () => {
      const medId = 'med-1';
      const userId = 'user-1';
      const dto = { medicineName: 'Glucophage' };

      mockMedicationsRepository.findOne.mockResolvedValue({
        id: medId,
        userId: 'other',
      });

      await expect(service.update(medId, userId, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete a medication log if owned by user', async () => {
      const medId = 'med-1';
      const userId = 'user-1';
      const existingMed = { id: medId, userId };

      mockMedicationsRepository.findOne.mockResolvedValue(existingMed);
      mockMedicationsRepository.softDelete.mockResolvedValue(existingMed);

      const result = await service.remove(medId, userId);
      expect(result).toEqual(existingMed);
      expect(repository.softDelete).toHaveBeenCalledWith(medId, userId);
    });

    it('should check ownership before delete', async () => {
      const medId = 'med-1';
      const userId = 'user-1';

      mockMedicationsRepository.findOne.mockResolvedValue({
        id: medId,
        userId: 'other',
      });

      await expect(service.remove(medId, userId)).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.softDelete).not.toHaveBeenCalled();
    });
  });
});
