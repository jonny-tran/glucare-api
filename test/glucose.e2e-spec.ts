import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AtGuard } from 'src/modules/auth/guards/auth.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('GlucoseController (e2e)', () => {
  let app: INestApplication;

  // Create fake users
  const userA = {
    sub: '00000000-0000-0000-0000-000000000001',
    role: 'PATIENT',
  };
  const userB = {
    sub: '00000000-0000-0000-0000-000000000002',
    role: 'PATIENT',
  };

  // Mock Guard
  const mockAtGuard: CanActivate = {
    canActivate: (context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest();
      const userId = req.headers['x-user-id'];
      if (userId === 'userA') req.user = userA;
      else if (userId === 'userB') req.user = userB;
      else return false;
      return true;
    },
  };

  const mockRolesGuard: CanActivate = {
    canActivate: () => true,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AtGuard)
      .useValue(mockAtGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    app = moduleFixture.createNestApplication();

    // Enable ValidationPipe as in main.ts
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/v1/glucose (POST)', () => {
    it('should create glucose reading for User A', () => {
      return request(app.getHttpServer())
        .post('/v1/glucose')
        .set('x-user-id', 'userA')
        .send({
          glucoseValue: 120,
          readingType: 'MANUAL',
          mealContext: 'FASTING',
          recordedAt: new Date().toISOString(),
          notes: 'Test E2E',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.data.glucoseValue).toBe('120.00');
          expect(res.body.data.userId).toBe(userA.sub);
          expect(res.body.message).toBe(
            'Ghi nhận chỉ số đường huyết thành công',
          );
        });
    });

    it('should fail with 400 for invalid range (700)', () => {
      return request(app.getHttpServer())
        .post('/v1/glucose')
        .set('x-user-id', 'userA')
        .send({
          glucoseValue: 700,
          readingType: 'MANUAL',
          mealContext: 'FASTING',
          recordedAt: new Date().toISOString(),
        })
        .expect(400);
      // Expect localized message if possible, or at least Bad Request
    });
  });

  describe('Data Isolation', () => {
    it('User B should not see User A dashboard data', async () => {
      // 1. User A has data (created above)
      // 2. User B fetches dashboard
      return request(app.getHttpServer())
        .get('/v1/glucose/dashboard')
        .set('x-user-id', 'userB')
        .expect(200)
        .expect((res) => {
          // latestReading should be null for User B
          expect(res.body.data.latestReading).toBeNull();
        });
    });

    it('User A should see dashboard data', async () => {
      return request(app.getHttpServer())
        .get('/v1/glucose/dashboard')
        .set('x-user-id', 'userA')
        .expect(200)
        .expect((res) => {
          // latestReading should NOT be null
          expect(res.body.data.latestReading).not.toBeNull();
          expect(res.body.data.latestReading.value).toBe(120);
        });
    });
  });
});
