import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSharingService } from '../data-sharing/data-sharing.service';
import { UsersRepository } from '../users/users.repository';
import { ConnectionsRepository } from './connections.repository';
import { ConnectionsService } from './connections.service';
import { InviteConnectionDto } from './dto/invite-connection.dto';
import {
  ConnectionAction,
  RespondConnectionDto,
} from './dto/respond-connection.dto';

// Define mock interfaces for better type safety
interface MockUsersRepository {
  findUserById: jest.Mock;
  findUserByEmail: jest.Mock;
  findPatientByUserId: jest.Mock;
  findDoctorByUserId: jest.Mock;
}

// Rename to avoid conflict if any, though local scope is fine.
// ConnectionAction is imported above.
interface MockConnectionsRepository {
  create: jest.Mock;
  findByPatientAndDoctor: jest.Mock;
  findById: jest.Mock;
  updateStatus: jest.Mock;
  findAllForPatient: jest.Mock;
  findAllForDoctor: jest.Mock;
}

interface MockDataSharingService {
  createInitialSharing: jest.Mock;
}

describe('ConnectionsService', () => {
  let service: ConnectionsService;
  let repo: MockConnectionsRepository;
  let usersRepo: MockUsersRepository;
  let sharingService: MockDataSharingService;

  beforeEach(async () => {
    // Create mock objects
    const mockConnectionsRepository: MockConnectionsRepository = {
      create: jest.fn(),
      findByPatientAndDoctor: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
      findAllForPatient: jest.fn(),
      findAllForDoctor: jest.fn(),
    };

    const mockUsersRepository: MockUsersRepository = {
      findUserById: jest.fn(),
      findUserByEmail: jest.fn(),
      findPatientByUserId: jest.fn(),
      findDoctorByUserId: jest.fn(),
    };

    const mockDataSharingService: MockDataSharingService = {
      createInitialSharing: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectionsService,
        { provide: ConnectionsRepository, useValue: mockConnectionsRepository },
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: DataSharingService, useValue: mockDataSharingService },
      ],
    }).compile();

    service = module.get<ConnectionsService>(ConnectionsService);
    repo = module.get(ConnectionsRepository);
    usersRepo = module.get(UsersRepository);
    sharingService = module.get(DataSharingService);
  });

  describe('sendInvite', () => {
    it('should throw BadRequest if user tries to connect with same role', async () => {
      const userId = 'user-1';
      const dto: InviteConnectionDto = { email: 'target@example.com' };

      usersRepo.findUserById.mockResolvedValue({ id: userId, role: 'PATIENT' });
      usersRepo.findUserByEmail.mockResolvedValue({
        id: 'target-1',
        role: 'PATIENT',
      });

      await expect(service.sendInvite(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequest if connection is already ACTIVE', async () => {
      const userId = 'patient-user-1';
      const dto: InviteConnectionDto = { email: 'doctor@example.com' };

      usersRepo.findUserById.mockResolvedValue({ id: userId, role: 'PATIENT' });
      usersRepo.findUserByEmail.mockResolvedValue({
        id: 'doctor-user-1',
        role: 'DOCTOR',
      });
      usersRepo.findPatientByUserId.mockResolvedValue({ id: 'patient-1' });
      usersRepo.findDoctorByUserId.mockResolvedValue({ id: 'doctor-1' });

      repo.findByPatientAndDoctor.mockResolvedValue({ status: 'ACTIVE' });

      await expect(service.sendInvite(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create invite if no existing connection', async () => {
      const userId = 'patient-user-1';
      const dto: InviteConnectionDto = { email: 'doctor@example.com' };

      usersRepo.findUserById.mockResolvedValue({ id: userId, role: 'PATIENT' });
      usersRepo.findUserByEmail.mockResolvedValue({
        id: 'doctor-user-1',
        role: 'DOCTOR',
      });
      usersRepo.findPatientByUserId.mockResolvedValue({ id: 'patient-1' });
      usersRepo.findDoctorByUserId.mockResolvedValue({ id: 'doctor-1' });

      repo.findByPatientAndDoctor.mockResolvedValue(null);
      repo.create.mockResolvedValue({ id: 'conn-1', status: 'PENDING' });

      const result = await service.sendInvite(userId, dto);
      expect(result).toEqual({ id: 'conn-1', status: 'PENDING' });
      expect(repo.create).toHaveBeenCalledWith('patient-1', 'doctor-1');
    });
  });

  describe('respondConnection', () => {
    it('should create initial sharing when ACCEPTED', async () => {
      const userId = 'doctor-user-1';
      const connectionId = 'conn-1';
      const dto: RespondConnectionDto = { action: ConnectionAction.ACCEPT };

      repo.findById.mockResolvedValue({
        id: connectionId,
        status: 'PENDING',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
      });
      usersRepo.findUserById.mockResolvedValue({ id: userId, role: 'DOCTOR' });
      usersRepo.findDoctorByUserId.mockResolvedValue({ id: 'doctor-1' });
      repo.updateStatus.mockResolvedValue({
        id: connectionId,
        status: 'ACTIVE',
      });

      await service.respondConnection(userId, connectionId, dto);

      expect(repo.updateStatus).toHaveBeenCalledWith(connectionId, 'ACTIVE');
      expect(sharingService.createInitialSharing).toHaveBeenCalledWith(
        'patient-1',
        'doctor-1',
      );
    });
  });
});
