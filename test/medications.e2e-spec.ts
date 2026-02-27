/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call */
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

import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from 'src/database/database.module';
import * as schema from 'src/database/schema';

describe('MedicationsController (e2e)', () => {
  let app: INestApplication;
  let db: NodePgDatabase<typeof schema>;

  // Create fake users (Unique IDs to avoid conflict with Meals test)
  const userA = {
    sub: '00000000-0000-0000-0000-000000000003',
    role: 'PATIENT',
  };
  const userB = {
    sub: '00000000-0000-0000-0000-000000000004',
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
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    db = app.get(DATABASE_CONNECTION);
    // Seed users
    await db
      .insert(schema.users)
      .values([
        {
          id: userA.sub,
          phoneNumber: '0000000003',
          email: 'testC@example.com',
          password: 'hash',
          role: 'PATIENT',
        },
        {
          id: userB.sub,
          phoneNumber: '0000000004',
          email: 'testD@example.com',
          password: 'hash',
          role: 'PATIENT',
        },
      ])
      .onConflictDoNothing();
  });

  afterAll(async () => {
    await db.delete(schema.users).where(eq(schema.users.id, userA.sub));
    await db.delete(schema.users).where(eq(schema.users.id, userB.sub));
    await app.close();
  });

  let createdMedId: string;

  describe('/v1/medications (POST)', () => {
    it('should create medication log for User A', () => {
      return request(app.getHttpServer())
        .post('/medications')
        .set('x-user-id', 'userA')
        .send({
          medicineName: 'Insulin',
          dosage: 10,
          unit: 'units',
          recordedAt: new Date().toISOString(),
          notes: 'Trước ăn',
        })
        .expect(201)
        .expect((res) => {
          createdMedId = res.body.data.id;
          expect(res.body.data.medicineName).toBe('Insulin');
          expect(res.body.data.userId).toBe(userA.sub);
          expect(res.body.message).toBe('Ghi nhận uống thuốc thành công');
        });
    });

    it('should fail if medicineName is missing', () => {
      return request(app.getHttpServer())
        .post('/medications')
        .set('x-user-id', 'userA')
        .send({
          dosage: 10,
          recordedAt: new Date().toISOString(),
        })
        .expect(400); // Bad Request validations
    });
  });

  describe('/v1/medications/history (GET)', () => {
    it('should return history for User A', () => {
      return request(app.getHttpServer())
        .get('/medications/history')
        .set('x-user-id', 'userA')
        .query({ page: 1, limit: 10 })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data.data)).toBe(true);
          expect(res.body.data.data.length).toBeGreaterThan(0);
          expect(res.body.message).toBe('Lấy lịch sử uống thuốc thành công');
        });
    });

    it('should return empty history for User B', () => {
      return request(app.getHttpServer())
        .get('/medications/history')
        .set('x-user-id', 'userB')
        .expect(200)
        .expect((res) => {
          const userAData = res.body.data.data.find(
            (m: any) => m.userId === userA.sub,
          );
          expect(userAData).toBeUndefined();
        });
    });
  });

  describe('/v1/medications/:id (GET)', () => {
    it('should get med details for User A', () => {
      return request(app.getHttpServer())
        .get(`/medications/${createdMedId}`)
        .set('x-user-id', 'userA')
        .expect(200)
        .expect((res) => {
          expect(res.body.data.id).toBe(createdMedId);
        });
    });

    it('should throw 403/404 if User B accesses User A data', () => {
      return request(app.getHttpServer())
        .get(`/medications/${createdMedId}`)
        .set('x-user-id', 'userB')
        .expect(400) // Ownership failure
        .expect((res) => {
          expect(res.body.message).toBe(
            'Bạn không có quyền truy cập dữ liệu này',
          );
        });
    });
  });

  describe('/v1/medications/:id (PATCH)', () => {
    it('should update med for User A', () => {
      return request(app.getHttpServer())
        .patch(`/medications/${createdMedId}`)
        .set('x-user-id', 'userA')
        .send({ medicineName: 'Metformin XR' })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.medicineName).toBe('Metformin XR');
          expect(res.body.message).toBe('Cập nhật bản ghi thuốc thành công');
        });
    });

    it('should prevent User B from updating', () => {
      return request(app.getHttpServer())
        .patch(`/medications/${createdMedId}`)
        .set('x-user-id', 'userB')
        .send({ medicineName: 'Hack' })
        .expect(400);
    });
  });

  describe('/v1/medications/:id (DELETE)', () => {
    it('should prevent User B from deleting', () => {
      return request(app.getHttpServer())
        .delete(`/medications/${createdMedId}`)
        .set('x-user-id', 'userB')
        .expect(400);
    });

    it('should soft delete med for User A', () => {
      return request(app.getHttpServer())
        .delete(`/medications/${createdMedId}`)
        .set('x-user-id', 'userA')
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Xóa bản ghi thuốc thành công');
          expect(res.body.data.deletedAt).not.toBeNull();
        });
    });

    it('should not find deleted med anymore', () => {
      return request(app.getHttpServer())
        .get(`/medications/${createdMedId}`)
        .set('x-user-id', 'userA')
        .expect(404);
      // Should also check history doesn't return it ideally, but deletion test is enough for "no longer accessible via GET :id".
    });
  });
});
