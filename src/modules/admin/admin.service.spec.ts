import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from 'src/database/schema';
import { AdminRepository } from './admin.repository';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;

  const mockAdminRepository = {
    findAllUsers: jest.fn(),
    findUserById: jest.fn(),
    updateUserStatus: jest.fn(),
    findPendingDoctors: jest.fn(),
    findDoctorById: jest.fn(),
    verifyDoctor: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: AdminRepository,
          useValue: mockAdminRepository,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUsers', () => {
    it('should return paginated users with filters', async () => {
      const query = {
        page: 1,
        limit: 10,
        role: UserRole.PATIENT,
        isActive: true,
      };
      const expectedResult = {
        data: [{ id: 'user-1', email: 'test@example.com' }],
        meta: { total: 1, page: 1, limit: 10, lastPage: 1 },
      };

      mockAdminRepository.findAllUsers.mockResolvedValue(expectedResult);

      const result = await service.getUsers(query);

      expect(mockAdminRepository.findAllUsers).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('updateUserStatus', () => {
    it('should successfully toggle isActive', async () => {
      const userId = 'user-1';
      const dto = { isActive: false };
      const user = { id: userId, isActive: true };
      const updatedUser = { id: userId, isActive: false };

      mockAdminRepository.findUserById.mockResolvedValue(user);
      mockAdminRepository.updateUserStatus.mockResolvedValue(updatedUser);

      const result = await service.updateUserStatus(userId, dto);

      expect(mockAdminRepository.findUserById).toHaveBeenCalledWith(userId);
      expect(mockAdminRepository.updateUserStatus).toHaveBeenCalledWith(
        userId,
        dto.isActive,
      );
      expect(result).toEqual(updatedUser);
    });

    it('should throw error if user not found', async () => {
      const userId = 'user-1';
      const dto = { isActive: false };

      mockAdminRepository.findUserById.mockResolvedValue(null);

      await expect(service.updateUserStatus(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockAdminRepository.findUserById).toHaveBeenCalledWith(userId);
      expect(mockAdminRepository.updateUserStatus).not.toHaveBeenCalled();
    });
  });

  describe('verifyDoctor', () => {
    it('should successfully verify doctor (update user status to active)', async () => {
      const doctorId = 'doc-1';
      const doctor = {
        id: doctorId,
        userId: 'user-1',
        user: { id: 'user-1', isActive: false },
      };
      const updatedUser = { id: 'user-1', isActive: true };

      mockAdminRepository.findDoctorById.mockResolvedValue(doctor);
      mockAdminRepository.verifyDoctor.mockResolvedValue(updatedUser);

      const result = await service.verifyDoctor(doctorId);

      expect(mockAdminRepository.findDoctorById).toHaveBeenCalledWith(doctorId);
      expect(mockAdminRepository.verifyDoctor).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(updatedUser);
    });

    it('should return user directly if already active', async () => {
      const doctorId = 'doc-1';
      const doctor = {
        id: doctorId,
        userId: 'user-1',
        user: { id: 'user-1', isActive: true },
      };

      mockAdminRepository.findDoctorById.mockResolvedValue(doctor);

      const result = await service.verifyDoctor(doctorId);

      expect(mockAdminRepository.findDoctorById).toHaveBeenCalledWith(doctorId);
      expect(mockAdminRepository.verifyDoctor).not.toHaveBeenCalled();
      expect(result).toEqual(doctor.user);
    });

    it('should throw error if doctor not found', async () => {
      const doctorId = 'doc-1';

      mockAdminRepository.findDoctorById.mockResolvedValue(null);

      await expect(service.verifyDoctor(doctorId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockAdminRepository.findDoctorById).toHaveBeenCalledWith(doctorId);
      expect(mockAdminRepository.verifyDoctor).not.toHaveBeenCalled();
    });

    it('should propagate errors from repository properly', async () => {
      const doctorId = 'doc-1';
      const doctor = {
        id: doctorId,
        userId: 'user-1',
        user: { id: 'user-1', isActive: false },
      };

      mockAdminRepository.findDoctorById.mockResolvedValue(doctor);
      mockAdminRepository.verifyDoctor.mockRejectedValue(new Error('DB Error'));

      await expect(service.verifyDoctor(doctorId)).rejects.toThrow('DB Error');
    });
  });
});
