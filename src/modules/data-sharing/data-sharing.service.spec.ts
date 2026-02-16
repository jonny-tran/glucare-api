import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersRepository } from '../users/users.repository';
import { DataSharingRepository } from './data-sharing.repository';
import { DataSharingService } from './data-sharing.service';
import { ToggleSharingDto } from './dto/toggle-sharing.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';

interface MockDataSharingRepository {
  findByPatientAndDoctor: jest.Mock;
  createDefault: jest.Mock;
  updatePermissions: jest.Mock;
  updateStatus: jest.Mock;
}

interface MockUsersRepository {
  findPatientByUserId: jest.Mock;
  findDoctorByUserId: jest.Mock;
}

describe('DataSharingService', () => {
  let service: DataSharingService;
  let repo: MockDataSharingRepository;
  let usersRepo: MockUsersRepository;

  beforeEach(async () => {
    const mockRepo: MockDataSharingRepository = {
      findByPatientAndDoctor: jest.fn(),
      createDefault: jest.fn(),
      updatePermissions: jest.fn(),
      updateStatus: jest.fn(),
    };

    const mockUsersRepo: MockUsersRepository = {
      findPatientByUserId: jest.fn(),
      findDoctorByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataSharingService,
        { provide: DataSharingRepository, useValue: mockRepo },
        { provide: UsersRepository, useValue: mockUsersRepo },
      ],
    }).compile();

    service = module.get<DataSharingService>(DataSharingService);
    repo = module.get(DataSharingRepository);
    usersRepo = module.get(UsersRepository);
  });

  describe('updatePermissions', () => {
    it('should merge permissions correctly', async () => {
      const userId = 'patient-user-1';
      const dto: UpdatePermissionsDto = {
        doctorId: 'doctor-1',
        viewGlucose: true,
        viewMeals: false,
      };

      usersRepo.findPatientByUserId.mockResolvedValue({ id: 'patient-1' });
      repo.findByPatientAndDoctor.mockResolvedValue({
        permissions: ['VIEW_MEALS', 'VIEW_MEDICATIONS'],
      });
      repo.updatePermissions.mockResolvedValue({ updated: true });

      await service.updatePermissions(userId, dto);

      // Expected: VIEW_MEALS removed, VIEW_GLUCOSE added, VIEW_MEDICATIONS kept
      const expectedPermissions = expect.arrayContaining([
        'VIEW_GLUCOSE',
        'VIEW_MEDICATIONS',
      ]) as unknown as string[];
      expect(repo.updatePermissions).toHaveBeenCalledWith(
        'patient-1',
        'doctor-1',
        expectedPermissions,
      );
    });

    it('should throw BadRequest if user is not a patient', async () => {
      usersRepo.findPatientByUserId.mockResolvedValue(null);
      await expect(
        service.updatePermissions('non-patient', {} as UpdatePermissionsDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('toggleSharing', () => {
    it('should update isActive status', async () => {
      const userId = 'patient-user-1';
      const dto: ToggleSharingDto = { doctorId: 'doctor-1', isActive: false };

      usersRepo.findPatientByUserId.mockResolvedValue({ id: 'patient-1' });
      repo.findByPatientAndDoctor.mockResolvedValue({ id: 'sharing-1' });
      repo.updateStatus.mockResolvedValue({ isActive: false });

      await service.toggleSharing(userId, dto);

      expect(repo.updateStatus).toHaveBeenCalledWith(
        'patient-1',
        'doctor-1',
        false,
      );
    });
  });
});
