import { Test, TestingModule } from '@nestjs/testing';
import { ConnectionsRepository } from '../connections/connections.repository';
import { GlucoseRepository } from '../glucose/glucose.repository';
import { GlucoseService } from '../glucose/glucose.service';
import { GlucoseAnalyticsService } from '../glucose/services/glucose-analytics.service';
import { MealsService } from '../meals/meals.service';
import { MedicationsService } from '../medications/medications.service';
import { UsersRepository } from '../users/users.repository';
import { DoctorNotesRepository } from './doctor-notes.repository';
import { DoctorsService } from './doctors.service';

interface MockGlucoseRepository {
  findLatest: jest.Mock;
  findByDateRange: jest.Mock;
}

interface MockConnectionsRepository {
  findAllForDoctor: jest.Mock;
  findPatientsWithOverview: jest.Mock;
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
      findPatientsWithOverview: jest.fn(),
    };

    const mockUsersRepo = {
      findDoctorByUserId: jest.fn(),
      findPatientById: jest.fn(),
    };

    const mockDoctorNotesRepo = {
      create: jest.fn(),
      findByPatient: jest.fn(),
    };

    const mockGlucoseService = { getHistory: jest.fn() };
    const mockMealsService = { findAll: jest.fn() };
    const mockMedicationsService = { findAll: jest.fn() };

    const mockSystemConfigService = {
      getConfigValue: jest.fn().mockImplementation(async (key: string) => {
        if (key === 'GLUCOSE_SAFE_MIN') return 70;
        if (key === 'GLUCOSE_SAFE_MAX') return 180;
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorsService,
        { provide: ConnectionsRepository, useValue: mockConnectionsRepo },
        { provide: UsersRepository, useValue: mockUsersRepo },
        { provide: GlucoseRepository, useValue: mockGlucoseRepo },
        {
          provide: GlucoseAnalyticsService,
          useFactory: () =>
            new GlucoseAnalyticsService(
              mockSystemConfigService as unknown as import('../system-config/system-config.service').SystemConfigService,
            ),
        },
        { provide: DoctorNotesRepository, useValue: mockDoctorNotesRepo },
        { provide: GlucoseService, useValue: mockGlucoseService },
        { provide: MealsService, useValue: mockMealsService },
        { provide: MedicationsService, useValue: mockMedicationsService },
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

    it('should classify Critical High (RED) correctly', async () => {
      usersRepo.findDoctorByUserId.mockResolvedValue({ id: doctorId });
      connectionsRepo.findPatientsWithOverview.mockResolvedValue([
        {
          patientId: patientProfile.id,
          userId: patientUser.id,
          fullName: patientUser.fullName,
          email: patientUser.email,
          avatarUrl: patientUser.avatarUrl,
          lastGlucose: '300.00',
          lastGlucoseTime: new Date(),
          dangerLevel: 'RED',
        },
      ]);
      glucoseRepo.findByDateRange.mockResolvedValue([]);

      const result = await service.getPatients(doctorUserId);

      expect(result[0].dangerLevel).toBe('RED');
      expect(result[0].dangerDetails).toContain('Hyperglycemia Critical');
    });

    it('should classify Critical Low (RED) correctly', async () => {
      usersRepo.findDoctorByUserId.mockResolvedValue({ id: doctorId });
      connectionsRepo.findPatientsWithOverview.mockResolvedValue([
        {
          patientId: patientProfile.id,
          userId: patientUser.id,
          fullName: patientUser.fullName,
          email: patientUser.email,
          avatarUrl: patientUser.avatarUrl,
          lastGlucose: '40.00',
          lastGlucoseTime: new Date(),
          dangerLevel: 'RED',
        },
      ]);
      glucoseRepo.findByDateRange.mockResolvedValue([]);

      const result = await service.getPatients(doctorUserId);

      expect(result[0].dangerLevel).toBe('RED');
      expect(result[0].dangerDetails).toContain('Hypoglycemia Critical');
    });

    it('should classify Stable (GREEN) correctly', async () => {
      usersRepo.findDoctorByUserId.mockResolvedValue({ id: doctorId });
      connectionsRepo.findPatientsWithOverview.mockResolvedValue([
        {
          patientId: patientProfile.id,
          userId: patientUser.id,
          fullName: patientUser.fullName,
          email: patientUser.email,
          avatarUrl: patientUser.avatarUrl,
          lastGlucose: '100.00',
          lastGlucoseTime: new Date(),
          dangerLevel: 'GREEN',
        },
      ]);
      glucoseRepo.findByDateRange.mockResolvedValue([]);

      const result = await service.getPatients(doctorUserId);

      expect(result[0].dangerLevel).toBe('GREEN');
      expect(result[0].dangerDetails).toBe('Stable');
    });

    it('should handle patients with NO data gracefully (GREY)', async () => {
      usersRepo.findDoctorByUserId.mockResolvedValue({ id: doctorId });
      connectionsRepo.findPatientsWithOverview.mockResolvedValue([
        {
          patientId: patientProfile.id,
          userId: patientUser.id,
          fullName: patientUser.fullName,
          email: patientUser.email,
          avatarUrl: patientUser.avatarUrl,
          lastGlucose: null,
          lastGlucoseTime: null,
          dangerLevel: 'GREY',
        },
      ]);
      glucoseRepo.findByDateRange.mockResolvedValue([]);

      const result = await service.getPatients(doctorUserId);

      expect(result[0].dangerLevel).toBe('GREY');
      expect(result[0].lastGlucose).toBeNull();
      expect(result[0].tir7Days).toBe(0);
    });
  });

  describe('Updated Business Logic', () => {
    const doctorUserId = 'doctor-user-1';
    const doctorId = 'doctor-1';

    it('should use findPatientsWithOverview from connectionsRepo', async () => {
      usersRepo.findDoctorByUserId.mockResolvedValue({ id: doctorId });
      connectionsRepo.findPatientsWithOverview.mockResolvedValue([
        {
          patientId: 'p1',
          userId: 'u1',
          fullName: 'John Doe',
          email: 'john@example.com',
          avatarUrl: null,
          lastGlucose: '120.00',
          lastGlucoseTime: new Date(),
          dangerLevel: 'GREEN',
        },
      ]);
      glucoseRepo.findByDateRange.mockResolvedValue([]);

      const result = await service.getPatients(doctorUserId);

      expect(connectionsRepo.findPatientsWithOverview).toHaveBeenCalledWith(
        doctorId,
        undefined,
      );
      expect(result[0].fullName).toBe('John Doe');
      expect(result[0].dangerLevel).toBe('GREEN');
    });
  });
});
