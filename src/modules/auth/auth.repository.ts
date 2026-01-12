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
}
