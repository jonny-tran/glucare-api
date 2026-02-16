import { Test, TestingModule } from '@nestjs/testing';
import { ConnectionsRepository } from '../connections/connections.repository';
import { GlucoseRepository } from '../glucose/glucose.repository';
import { GlucoseAnalyticsService } from '../glucose/services/glucose-analytics.service';
import { UsersRepository } from '../users/users.repository';
import { DoctorsService } from './doctors.service';

interface MockGlucoseRepository {
  findLatest: jest.Mock;
  findByDateRange: jest.Mock;
}

interface MockConnectionsRepository {
  findAllForDoctor: jest.Mock;
}

interface MockUsersRepository {
  findDoctorByUserId: jest.Mock;
}

describe('DoctorsService', () => {
  let service: DoctorsService;
  let glucoseRepo: MockGlucoseRepository;
  let connectionsRepo: MockConnectionsRepository;
  let usersRepo: MockUsersRepository;

  beforeEach(async () => {
    const mockGlucoseRepo = {
      findLatest: jest.fn(),
      findByDateRange: jest.fn(),
    };

    const mockConnectionsRepo = {
      findAllForDoctor: jest.fn(),
    };

    const mockUsersRepo = {
      findDoctorByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorsService,
        { provide: GlucoseRepository, useValue: mockGlucoseRepo },
        { provide: ConnectionsRepository, useValue: mockConnectionsRepo },
        { provide: UsersRepository, useValue: mockUsersRepo },
        {
          provide: GlucoseAnalyticsService,
          useValue: new GlucoseAnalyticsService(),
        }, // Use real analytics or mock if complex
      ],
    }).compile();

    service = module.get<DoctorsService>(DoctorsService);
    glucoseRepo = module.get(GlucoseRepository);
    connectionsRepo = module.get(ConnectionsRepository);
    usersRepo = module.get(UsersRepository);
  });

  describe('getPatients', () => {
    const doctorUserId = 'doctor-user-1';
    const doctorId = 'doctor-1';
    const patientUser = {
      id: 'patient-user-1',
      fullName: 'Patient One',
      email: 'p1@example.com',
      avatarUrl: null,
    };
    const patientProfile = {
      id: 'patient-1',
      user: patientUser,
    };
    const activeConnection = {
      status: 'ACTIVE',
      patient: patientProfile,
    };

    it('should classify Critical High (RED) correctly', async () => {
      usersRepo.findDoctorByUserId.mockResolvedValue({ id: doctorId });
      connectionsRepo.findAllForDoctor.mockResolvedValue([activeConnection]);

      // Mock HIGH glucose
      glucoseRepo.findLatest.mockResolvedValue({
        glucoseValue: '300.00',
        recordedAt: new Date(),
      });
      glucoseRepo.findByDateRange.mockResolvedValue([]); // No history for TIR test

      const result = await service.getPatients(doctorUserId);

      expect(result[0].dangerLevel).toBe('RED');
      expect(result[0].dangerDetails).toContain('Hyperglycemia Critical');
    });

    it('should classify Critical Low (RED) correctly', async () => {
      usersRepo.findDoctorByUserId.mockResolvedValue({ id: doctorId });
      connectionsRepo.findAllForDoctor.mockResolvedValue([activeConnection]);

      // Mock LOW glucose
      glucoseRepo.findLatest.mockResolvedValue({
        glucoseValue: '40.00',
        recordedAt: new Date(),
      });
      glucoseRepo.findByDateRange.mockResolvedValue([]);

      const result = await service.getPatients(doctorUserId);

      expect(result[0].dangerLevel).toBe('RED');
      expect(result[0].dangerDetails).toContain('Hypoglycemia Critical');
    });

    it('should classify Stable (GREEN) correctly', async () => {
      usersRepo.findDoctorByUserId.mockResolvedValue({ id: doctorId });
      connectionsRepo.findAllForDoctor.mockResolvedValue([activeConnection]);

      // Mock NORMAL glucose
      glucoseRepo.findLatest.mockResolvedValue({
        glucoseValue: '100.00',
        recordedAt: new Date(),
      });
      glucoseRepo.findByDateRange.mockResolvedValue([]);

      const result = await service.getPatients(doctorUserId);

      expect(result[0].dangerLevel).toBe('GREEN');
      expect(result[0].dangerDetails).toBe('Stable');
    });

    it('should handle patients with NO data gracefully (GREY)', async () => {
      usersRepo.findDoctorByUserId.mockResolvedValue({ id: doctorId });
      connectionsRepo.findAllForDoctor.mockResolvedValue([activeConnection]);

      // Mock NO glucose
      glucoseRepo.findLatest.mockResolvedValue(null);
      glucoseRepo.findByDateRange.mockResolvedValue([]);

      const result = await service.getPatients(doctorUserId);

      expect(result[0].dangerLevel).toBe('GREY');
      expect(result[0].lastGlucose).toBeNull();
      expect(result[0].tir7Days).toBe(0); // Should default to 0
    });
  });
});
