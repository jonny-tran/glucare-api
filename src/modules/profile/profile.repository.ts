import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from 'src/database/database.module';
import * as schema from 'src/database/schema';

@Injectable()
export class ProfileRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findUserWithProfile(userId: string) {
    return this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      with: {
        patient: {
          columns: {
            gender: true,
            dateOfBirth: true,
            diabetesType: true,
          },
        },
        doctor: {
          columns: {
            licenseNumber: true,
            specialization: true,
            hospital: true,
          },
        },
      },
      columns: {
        password: false,
        hashedRefreshToken: false,
        avatarPublicId: false,
      },
    });
  }

  async findUserAvatarMeta(userId: string) {
    const row = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      columns: {
        avatarPublicId: true,
        avatarUrl: true,
      },
    });
    return row;
  }

  async updateUserBasics(
    userId: string,
    data: { fullName?: string; avatarUrl?: string; avatarPublicId?: string | null },
  ) {
    await this.db
      .update(schema.users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId));
  }

  async updatePatientProfile(
    userId: string,
    data: { gender?: 'M' | 'F' | 'O'; dateOfBirth?: string },
  ) {
    await this.db
      .update(schema.patients)
      .set(data)
      .where(eq(schema.patients.userId, userId));
  }

  async updateDoctorProfile(
    userId: string,
    data: { specialization?: string; hospital?: string },
  ) {
    await this.db
      .update(schema.doctors)
      .set(data)
      .where(eq(schema.doctors.userId, userId));
  }
}
