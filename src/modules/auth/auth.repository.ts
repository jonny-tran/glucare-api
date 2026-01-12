import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from 'src/database/database.module';
import * as schema from 'src/database/schema';

@Injectable()
export class AuthRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAdminByEmail(email: string) {
    return this.db.query.users.findFirst({
      where: and(eq(schema.users.email, email), eq(schema.users.role, 'ADMIN')),
    });
  }

  async findUserByPhoneNumber(phoneNumber: string) {
    return this.db.query.users.findFirst({
      where: eq(schema.users.phoneNumber, phoneNumber),
    });
  }

  async findUserWithProfile(userId: string) {
    return this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      with: {
        patient: {
          columns: {
            fullName: true,
            gender: true,
            dateOfBirth: true,
            diabetesType: true,
          },
        },
        doctor: {
          columns: {
            fullName: true,
            licenseNumber: true,
            specialization: true,
            hospital: true,
          },
        },
      },
      columns: {
        password: false,
        hashedRefreshToken: false,
      },
    });
  }

  async findById(userId: string) {
    return this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      columns: {
        id: true,
        email: true,
        phoneNumber: true,
        role: true,
        hashedRefreshToken: true,
      },
    });
  }

  async updateRefreshToken(userId: string, hashedRefreshToken: string | null) {
    await this.db
      .update(schema.users)
      .set({ hashedRefreshToken })
      .where(eq(schema.users.id, userId));
  }

  async createPatient(
    userData: {
      phoneNumber: string;
      password: string;
      role: 'PATIENT';
    },
    patientData: {
      fullName: string;
      gender: 'MALE' | 'FEMALE' | 'OTHER';
      dateOfBirth: string;
    },
  ) {
    return this.db.transaction(async (tx) => {
      const [user] = await tx.insert(schema.users).values(userData).returning();

      const [patient] = await tx
        .insert(schema.patients)
        .values({
          userId: user.id,
          ...patientData,
        })
        .returning();

      return { user, patient };
    });
  }

  async findDoctorByLicense(licenseNumber: string) {
    return this.db.query.doctors.findFirst({
      where: eq(schema.doctors.licenseNumber, licenseNumber),
    });
  }

  async createDoctor(
    userData: {
      phoneNumber: string;
      password: string;
      role: 'DOCTOR';
    },
    doctorData: {
      fullName: string;
      licenseNumber: string;
      specialization?: string;
      hospital?: string;
    },
  ) {
    return this.db.transaction(async (tx) => {
      const [user] = await tx.insert(schema.users).values(userData).returning();

      const [doctor] = await tx
        .insert(schema.doctors)
        .values({
          userId: user.id,
          ...doctorData,
        })
        .returning();

      return { user, doctor };
    });
  }
}
