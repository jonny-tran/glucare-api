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

describe('MealsController (e2e)', () => {
  let app: INestApplication;
  let db: NodePgDatabase<typeof schema>;

  // Create fake users
  const userA = {
    sub: '00000000-0000-0000-0000-000000000001',
    role: 'PATIENT',
  };
  const userB = {
    sub: '00000000-0000-0000-0000-000000000002',
    role: 'PATIENT',
  };

  // Mock Guard to simulate authenticated user
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
          phoneNumber: '0000000001',
          email: 'testA@example.com',
          password: 'hash',
          role: 'PATIENT',
        },
        {
          id: userB.sub,
          phoneNumber: '0000000002',
          email: 'testB@example.com',
          password: 'hash',
          role: 'PATIENT',
        },
      ])
      .onConflictDoNothing();
  });

  afterAll(async () => {
    // Cleanup
    await db.delete(schema.users).where(eq(schema.users.id, userA.sub));
    await db.delete(schema.users).where(eq(schema.users.id, userB.sub));
    await app.close();
  });

  let createdMealId: string;

  describe('/v1/meals (POST)', () => {
    it('should create meal for User A', () => {
      return request(app.getHttpServer())
        .post('/meals')
        .set('x-user-id', 'userA')
        .send({
          foodName: 'Bún bò',
          mealType: 'BREAKFAST',
          calories: 500,
          carbs: 50,
          recordedAt: new Date().toISOString(),
          notes: 'Ngon',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.data.foodName).toBe('Bún bò');
          expect(res.body.data.userId).toBe(userA.sub);
          expect(res.body.message).toBe('Ghi nhận bữa ăn thành công');
          createdMealId = res.body.data.id;
        });
    });

    it('should fail if calories is string', () => {
      return request(app.getHttpServer())
        .post('/meals')
        .set('x-user-id', 'userA')
        .send({
          foodName: 'Bún bò',
          mealType: 'BREAKFAST',
          calories: 'năm trăm',
          recordedAt: new Date().toISOString(),
        })
        .expect(400);
    });

    it('should fail if calories is negative', () => {
      return request(app.getHttpServer())
        .post('/meals')
        .set('x-user-id', 'userA')
        .send({
          foodName: 'Bún bò',
          mealType: 'BREAKFAST',
          calories: -100,
          recordedAt: new Date().toISOString(),
        })
        .expect(400);
    });
  });

  describe('/v1/meals/history (GET)', () => {
    it('should return history for User A', () => {
      return request(app.getHttpServer())
        .get('/meals/history')
        .set('x-user-id', 'userA')
        .query({ page: 1, limit: 10 })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data.data)).toBe(true);
          expect(res.body.data.data.length).toBeGreaterThan(0);
          expect(res.body.message).toBe('Lấy lịch sử bữa ăn thành công');
        });
    });

    it('should return empty history for User B (No data)', () => {
      return request(app.getHttpServer())
        .get('/meals/history')
        .set('x-user-id', 'userB')
        .expect(200)
        .expect((res) => {
          // Assuming User B has no data created in this test run or DB is clean enough
          // Actually, if using shared DB, it might see other data if we reused User B ID.
          // But strict ownership check should ensure User B sees only their data.
          // Since we haven't created data for User B, it should be empty or at least not contain User A's data.
          const userAData = res.body.data.data.find(
            (m: any) => m.userId === userA.sub,
          );
          expect(userAData).toBeUndefined();
        });
    });
  });

  describe('/v1/meals/:id (GET)', () => {
    it('should get meal details for User A', () => {
      return request(app.getHttpServer())
        .get(`/meals/${createdMealId}`)
        .set('x-user-id', 'userA')
        .expect(200)
        .expect((res) => {
          expect(res.body.data.id).toBe(createdMealId);
        });
    });

    it('should return 400/403/404 if User B tries to access User A meal', () => {
      return request(app.getHttpServer())
        .get(`/meals/${createdMealId}`)
        .set('x-user-id', 'userB')
        .expect(400) // Service throws BadRequest for ownership
        .expect((res) => {
          expect(res.body.message).toBe(
            'Bạn không có quyền truy cập dữ liệu này',
          );
        });
    });
  });

  describe('/v1/meals/:id (PATCH)', () => {
    it('should update meal for User A', () => {
      return request(app.getHttpServer())
        .patch(`/meals/${createdMealId}`)
        .set('x-user-id', 'userA')
        .send({ foodName: 'Phở bò tái' })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.foodName).toBe('Phở bò tái');
          expect(res.body.message).toBe('Cập nhật bữa ăn thành công');
        });
    });

    it('should prevent User B from updating User A meal', () => {
      return request(app.getHttpServer())
        .patch(`/meals/${createdMealId}`)
        .set('x-user-id', 'userB')
        .send({ foodName: 'Hacked' })
        .expect(400);
    });
  });

  describe('/v1/meals/:id (DELETE)', () => {
    it('should prevent User B from deleting User A meal', () => {
      return request(app.getHttpServer())
        .delete(`/meals/${createdMealId}`)
        .set('x-user-id', 'userB')
        .expect(400);
    });

    it('should soft delete meal for User A', () => {
      return request(app.getHttpServer())
        .delete(`/meals/${createdMealId}`)
        .set('x-user-id', 'userA')
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Xóa bữa ăn thành công');
          expect(res.body.data.deletedAt).not.toBeNull();
        });
    });

    it('should not find deleted meal in history', async () => {
      return (
        request(app.getHttpServer())
          .get(`/meals/${createdMealId}`)
          .set('x-user-id', 'userA')
          // Service first calls findOne which checks soft delete?
          // Repository findOne includes `isNull(deletedAt)`.
          // So it should return null from repo.
          // Service throws NotFound if null.
          .expect(404)
      );
    });
  });
});
