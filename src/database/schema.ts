import { relations } from 'drizzle-orm';
import {
  boolean,
  date,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

// --- ENUMS ---
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'DOCTOR', 'PATIENT']);
export const genderEnum = pgEnum('gender', ['MALE', 'FEMALE', 'OTHER']);
export const connectionStatusEnum = pgEnum('connection_status', [
  'PENDING',
  'ACTIVE',
  'REJECTED',
  'CANCELLED',
]);
export const diabetesType = pgEnum('diabetes_type', [
  'TYPE_1',
  'TYPE_2',
  'GDM',
  'OTHER',
]);
// --- TABLES ---

// 1. USERS
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Logic Login:
  // - Admin dùng email (not null ở tầng logic app)
  // - Doctor/Patient dùng phoneNumber (not null ở tầng logic app)
  phoneNumber: text('phone_number').unique(),
  email: text('email').unique(),

  password: text('password').notNull(),
  role: userRoleEnum('role').default('PATIENT').notNull(),

  hashedRefreshToken: text('hashed_refresh_token'),
  isActive: boolean('is_active').default(true),
  avatar_url: text('avatar_url'),

  // Hỗ trợ luồng OTP cho quên mật khẩu/xác thực
  isPhoneVerified: boolean('is_phone_verified').default(false),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

// 2. PATIENTS (Profile)
export const patients = pgTable('patients', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  fullName: text('full_name').notNull(),
  gender: genderEnum('gender'),
  dateOfBirth: date('date_of_birth'),
  diabetesType: diabetesType('diabetes_type'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 3. DOCTORS (Profile)
export const doctors = pgTable('doctors', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  fullName: text('full_name').notNull(),
  licenseNumber: text('license_number').notNull().unique(),
  specialization: text('specialization'),
  hospital: text('hospital'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

// 4. PATIENT_DOCTORS
export const patientDoctors = pgTable(
  'patient_doctors',
  {
    patientId: uuid('patient_id')
      .references(() => patients.id, { onDelete: 'cascade' })
      .notNull(),
    doctorId: uuid('doctor_id')
      .references(() => doctors.id, { onDelete: 'cascade' })
      .notNull(),
    status: connectionStatusEnum('status').default('PENDING').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.patientId, t.doctorId] }),
  }),
);

// --- RELATIONS ---
export const usersRelations = relations(users, ({ one }) => ({
  patient: one(patients, { fields: [users.id], references: [patients.userId] }),
  doctor: one(doctors, { fields: [users.id], references: [doctors.userId] }),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  user: one(users, { fields: [patients.userId], references: [users.id] }),
  doctors: many(patientDoctors),
}));

export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  user: one(users, { fields: [doctors.userId], references: [users.id] }),
  patients: many(patientDoctors),
}));

export const patientDoctorsRelations = relations(patientDoctors, ({ one }) => ({
  patient: one(patients, {
    fields: [patientDoctors.patientId],
    references: [patients.id],
  }),
  doctor: one(doctors, {
    fields: [patientDoctors.doctorId],
    references: [doctors.id],
  }),
}));
