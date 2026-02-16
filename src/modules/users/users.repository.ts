import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../database/database.module';
import * as schema from '../../database/schema';

@Injectable()
export class UsersRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findPatientByUserId(userId: string) {
    return this.db.query.patients.findFirst({
      where: eq(schema.patients.userId, userId),
    });
  }

  async findDoctorByUserId(userId: string) {
    return this.db.query.doctors.findFirst({
      where: eq(schema.doctors.userId, userId),
    });
  }

  async findUserById(id: string) {
    return this.db.query.users.findFirst({
      where: eq(schema.users.id, id),
    });
  }

  async findUserByEmail(email: string) {
    return this.db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });
  }
}
