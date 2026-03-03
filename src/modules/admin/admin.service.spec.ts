import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminRepository } from './admin.repository';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;

  // Use Record<string, jest.Mock> to avoid strict type checking on mocks
  const mockAdminRepository: Record<string, jest.Mock> = {
    findAllUsers: jest.fn(),
    findUserById: jest.fn(),
    updateUserStatus: jest.fn(),
    softDeleteUser: jest.fn(),
    findPendingDoctors: jest.fn(),
    findDoctorById: jest.fn(),
    verifyDoctor: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: AdminRepository, useValue: mockAdminRepository },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should return paginated users', async () => {
      const query = { page: 1, limit: 10 };
      const expected = {
        data: [],
        meta: { total: 0, page: 1, limit: 10, lastPage: 0 },
      };
      mockAdminRepository.findAllUsers.mockResolvedValue(expected);

      const result = await service.getUsers(query);

      expect(result).toEqual(expected);
      expect(mockAdminRepository.findAllUsers).toHaveBeenCalledWith(query);
    });
  });

  describe('updateUserStatus', () => {
    const adminId = 'admin-uuid';
    const userId = 'user-uuid';

    it('should successfully update user status to BLOCKED', async () => {
      const dto = { status: 'BLOCKED' as const, reason: 'Vi phạm' };
      mockAdminRepository.findUserById.mockResolvedValue({
        id: userId,
        role: 'PATIENT',
        status: 'ACTIVE',
      });
      mockAdminRepository.updateUserStatus.mockResolvedValue({
        id: userId,
        status: 'BLOCKED',
      });

      const result = await service.updateUserStatus(adminId, userId, dto);

      expect(result.status).toBe('BLOCKED');
      expect(mockAdminRepository.updateUserStatus).toHaveBeenCalledWith(
        userId,
        'BLOCKED',
      );
    });

    it('should throw BadRequestException when admin tries to block self', async () => {
      const dto = { status: 'BLOCKED' as const };

      await expect(
        service.updateUserStatus(adminId, adminId, dto),
      ).rejects.toThrow(BadRequestException);
      expect(mockAdminRepository.findUserById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      const dto = { status: 'BLOCKED' as const };
      mockAdminRepository.findUserById.mockResolvedValue(undefined);

      await expect(
        service.updateUserStatus(adminId, userId, dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when blocking another Admin', async () => {
      const dto = { status: 'BLOCKED' as const };
      mockAdminRepository.findUserById.mockResolvedValue({
        id: userId,
        role: 'ADMIN',
        status: 'ACTIVE',
      });

      await expect(
        service.updateUserStatus(adminId, userId, dto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('softDeleteUser', () => {
    const adminId = 'admin-uuid';
    const userId = 'user-uuid';

    it('should successfully soft-delete a user', async () => {
      mockAdminRepository.findUserById.mockResolvedValue({
        id: userId,
        role: 'PATIENT',
      });
      mockAdminRepository.softDeleteUser.mockResolvedValue({
        id: userId,
        email: 'test@test.com',
        fullName: 'Test User',
        deletedAt: new Date(),
      });

      const result = await service.softDeleteUser(adminId, userId);

      expect(result.deletedAt).toBeDefined();
    });

    it('should throw BadRequestException when admin tries to delete self', async () => {
      await expect(service.softDeleteUser(adminId, adminId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      mockAdminRepository.findUserById.mockResolvedValue(undefined);

      await expect(service.softDeleteUser(adminId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when trying to delete an Admin', async () => {
      mockAdminRepository.findUserById.mockResolvedValue({
        id: userId,
        role: 'ADMIN',
      });

      await expect(service.softDeleteUser(adminId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getPendingDoctors', () => {
    it('should return mapped pending doctors list', async () => {
      mockAdminRepository.findPendingDoctors.mockResolvedValue([
        {
          doctor: {
            id: 'doc-1',
            userId: 'u-1',
            licenseNumber: 'DOC-001',
            specialization: null,
            hospital: null,
            createdAt: new Date(),
          },
          user: {
            id: 'u-1',
            email: 'doc@test.com',
            fullName: 'Dr. Test',
            phoneNumber: '0901111111',
            status: 'PENDING' as const,
          },
        },
      ]);

      const result = await service.getPendingDoctors();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('user');
      expect(result[0].user.status).toBe('PENDING');
    });
  });

  describe('verifyDoctor', () => {
    it('should verify a pending doctor successfully', async () => {
      mockAdminRepository.findDoctorById.mockResolvedValue({
        id: 'doc-1',
        userId: 'u-1',
        licenseNumber: 'DOC-001',
        specialization: null,
        hospital: null,
        createdAt: new Date(),
        user: { id: 'u-1', status: 'PENDING' },
      });
      mockAdminRepository.verifyDoctor.mockResolvedValue({
        id: 'u-1',
        status: 'ACTIVE',
      });

      const result = await service.verifyDoctor('doc-1');

      expect(result.status).toBe('ACTIVE');
      expect(mockAdminRepository.verifyDoctor).toHaveBeenCalledWith('u-1');
    });

    it('should throw NotFoundException when doctor not found', async () => {
      mockAdminRepository.findDoctorById.mockResolvedValue(undefined);

      await expect(service.verifyDoctor('nonexists')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when doctor is already active', async () => {
      mockAdminRepository.findDoctorById.mockResolvedValue({
        id: 'doc-1',
        userId: 'u-1',
        licenseNumber: 'DOC-001',
        specialization: null,
        hospital: null,
        createdAt: new Date(),
        user: { id: 'u-1', status: 'ACTIVE' },
      });

      await expect(service.verifyDoctor('doc-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
