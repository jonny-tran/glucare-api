import { relations } from 'drizzle-orm';
import {
  boolean,
  date,
  decimal,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

// --- 1. ENUMS DEFINITION (Source of Truth) ---
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'DOCTOR', 'PATIENT']);
export const genderEnum = pgEnum('gender', ['M', 'F', 'O']);
export const diabetesTypeEnum = pgEnum('diabetes_type', ['GDM', 'T1D', 'T2D']);

// E-03, E-10: Status kết nối
export const connectionStatusEnum = pgEnum('connection_status', [
  'PENDING',
  'ACTIVE',
  'REJECTED',
  'CANCELLED',
]);

// E-04: Glucose
export const readingTypeEnum = pgEnum('reading_type', [
  'CGM',
  'SMBG',
  'Manual',
]);
export const mealContextEnum = pgEnum('meal_context', [
  'BEFORE_MEAL',
  'AFTER_MEAL',
  'FASTING',
  'BEDTIME',
]);

// E-05: Meals
export const mealTypeEnum = pgEnum('meal_type', [
  'BREAKFAST',
  'LUNCH',
  'DINNER',
  'SNACK',
]);

// E-11: Device
export const deviceTypeEnum = pgEnum('device_type', ['CGM', 'SMBG', 'MANUAL']);
export const connectionTypeEnum = pgEnum('connection_type', [
  'BLUETOOTH',
  'API',
  'MANUAL',
]);

// E-09: Reminders
export const reminderTypeEnum = pgEnum('reminder_type', [
  'MEDICATION',
  'GLUCOSE',
  'MEAL',
  'EXERCISE',
]);

// E-13: Chat Session
export const sessionTypeEnum = pgEnum('session_type', ['AI', 'Doctor']);
export const chatStatusEnum = pgEnum('chat_status', ['Active', 'Closed']);

// --- 2. CORE TABLES ---

// E-01 & E-02 Base User
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  phoneNumber: text('phone_number').unique(),
  email: text('email').unique(),
  password: text('password').notNull(),
  role: userRoleEnum('role').default('PATIENT').notNull(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  isActive: boolean('is_active').default(true),
  hashedRefreshToken: text('hashed_refresh_token'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// E-01 Extended Patient Profile
export const patients = pgTable('patients', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .unique()
    .notNull(),
  dateOfBirth: date('date_of_birth'),
  gender: genderEnum('gender'),
  diabetesType: diabetesTypeEnum('diabetes_type'),
  diagnosisDate: date('diagnosis_date'),
  createdAt: timestamp('created_at').defaultNow(),
});

// E-02 Extended Doctor Profile
export const doctors = pgTable('doctors', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .unique()
    .notNull(),
  licenseNumber: text('license_number'),
  specialization: text('specialization'),
  hospital: text('hospital'),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- 3. HEALTH DATA TABLES (Giai đoạn 1 - Core) ---

// E-04: Glucose Readings
export const glucoseReadings = pgTable('glucose_readings', {
  id: uuid('id').defaultRandom().primaryKey(),
  patientId: uuid('patient_id')
    .references(() => patients.id, { onDelete: 'cascade' })
    .notNull(),
  glucoseValue: decimal('glucose_value', { precision: 5, scale: 2 }).notNull(), // mg/dL
  readingType: readingTypeEnum('reading_type').default('Manual').notNull(),
  mealContext: mealContextEnum('meal_context').notNull(),
  readingTime: timestamp('reading_time').defaultNow().notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// E-05: Meals
export const meals = pgTable('meals', {
  id: uuid('id').defaultRandom().primaryKey(),
  patientId: uuid('patient_id')
    .references(() => patients.id, { onDelete: 'cascade' })
    .notNull(),
  mealType: mealTypeEnum('meal_type').notNull(),
  description: text('description').notNull(),
  carbsEstimate: decimal('carbs_estimate', { precision: 5, scale: 2 }), // grams
  imageUrl: text('image_url'), // Cho tính năng OCR sau này
  mealTime: timestamp('meal_time').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// E-06: Medications (Danh mục thuốc của bệnh nhân)
export const medications = pgTable('medications', {
  id: uuid('id').defaultRandom().primaryKey(),
  patientId: uuid('patient_id')
    .references(() => patients.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  dosage: text('dosage'), // Changed from dosageDefault (decimal) to match 'Dosage: VARCHAR'
  frequency: text('frequency'),
  instructions: text('instructions'),
  createdAt: timestamp('created_at').defaultNow(),
});

// E-07: Medication Logs (Lịch sử uống thuốc)
export const medicationLogs = pgTable('medication_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  patientId: uuid('patient_id')
    .references(() => patients.id, { onDelete: 'cascade' })
    .notNull(),
  medicationId: uuid('medication_id').references(() => medications.id, {
    onDelete: 'set null',
  }),
  dosageTaken: decimal('dosage_taken', { precision: 5, scale: 2 }).notNull(),
  takenAt: timestamp('taken_at').defaultNow().notNull(),
  notes: text('notes'),
});

// --- 4. CONNECTION & SHARING (Giai đoạn 2) ---

// E-03: Patient-Doctor Relationship (Quản lý kết nối)
export const patientDoctors = pgTable('patient_doctors', {
  id: uuid('id').defaultRandom().primaryKey(),
  patientId: uuid('patient_id')
    .references(() => patients.id, { onDelete: 'cascade' })
    .notNull(),
  doctorId: uuid('doctor_id')
    .references(() => doctors.id, { onDelete: 'cascade' })
    .notNull(),
  status: connectionStatusEnum('status').default('PENDING').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// E-10: Data Sharing Settings (Quyền truy cập chi tiết)
export const dataSharing = pgTable('data_sharing', {
  id: uuid('id').defaultRandom().primaryKey(),
  patientId: uuid('patient_id')
    .references(() => patients.id, { onDelete: 'cascade' })
    .notNull(),
  doctorId: uuid('doctor_id')
    .references(() => doctors.id, { onDelete: 'cascade' })
    .notNull(),
  isActive: boolean('is_active').default(true),
  startDate: date('start_date'),
  endDate: date('end_date'), // Có thể null nếu share vĩnh viễn
  permissions: json('permissions').$type<string[]>(), // Array các quyền: ['VIEW_GLUCOSE', 'VIEW_MEALS']
  createdAt: timestamp('created_at').defaultNow(),
});

// E-09: Health Report (Analytics)
export const healthReports = pgTable('health_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  patientId: uuid('patient_id')
    .references(() => patients.id, { onDelete: 'cascade' })
    .notNull(),
  tir: decimal('tir', { precision: 4, scale: 2 }), // Time In Range
  avgGlucose: decimal('avg_glucose', {
    precision: 5,
    scale: 2,
  }),
  hba1cEstimate: decimal('hba1c_estimate', {
    precision: 4,
    scale: 2,
  }),
  glycemicVariability: decimal('glycemic_variability', {
    precision: 5,
    scale: 2,
  }),
  generatedAt: timestamp('generated_at').defaultNow(),
});

// --- 5. SYSTEM & SUPPORT ---

// Reminders
export const reminders = pgTable('reminders', {
  id: uuid('id').defaultRandom().primaryKey(),
  patientId: uuid('patient_id')
    .references(() => patients.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  type: reminderTypeEnum('type').notNull(),
  time: text('time').notNull(), // "08:00"
  daysOfWeek: json('days_of_week').$type<number[]>(), // [0, 1, 2...6] (Sunday to Saturday)
  isEnabled: boolean('is_enabled').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// E-11: Devices
export const devices = pgTable('devices', {
  id: uuid('id').defaultRandom().primaryKey(),
  patientId: uuid('patient_id')
    .references(() => patients.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  deviceType: deviceTypeEnum('device_type').notNull(),
  serialNumber: text('serial_number'),
  lastSync: timestamp('last_sync'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// E-12: Knowledge Articles
export const knowledgeArticles = pgTable('knowledge_articles', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  category: text('category'),
  thumbnailUrl: text('thumbnail_url'),
  isPublished: boolean('is_published').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// E-13: ChatSession
export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  sessionType: sessionTypeEnum('session_type').notNull(),
  status: chatStatusEnum('status').default('Active').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- 6. RELATIONS ---

export const usersRelations = relations(users, ({ one, many }) => ({
  patient: one(patients, { fields: [users.id], references: [patients.userId] }),
  doctor: one(doctors, { fields: [users.id], references: [doctors.userId] }),
  chatSessions: many(chatSessions),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  user: one(users, { fields: [patients.userId], references: [users.id] }),
  glucoseReadings: many(glucoseReadings),
  meals: many(meals),
  medications: many(medications),
  medicationLogs: many(medicationLogs),
  doctors: many(patientDoctors),
  devices: many(devices),
  reminders: many(reminders),
  healthReports: many(healthReports),
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

// Relation for Health Data to access Patient info back if needed
export const glucoseReadingsRelations = relations(
  glucoseReadings,
  ({ one }) => ({
    patient: one(patients, {
      fields: [glucoseReadings.patientId],
      references: [patients.id],
    }),
  }),
);

export const medicationLogsRelations = relations(medicationLogs, ({ one }) => ({
  patient: one(patients, {
    fields: [medicationLogs.patientId],
    references: [patients.id],
  }),
  medication: one(medications, {
    fields: [medicationLogs.medicationId],
    references: [medications.id],
  }),
}));

export const healthReportsRelations = relations(healthReports, ({ one }) => ({
  patient: one(patients, {
    fields: [healthReports.patientId],
    references: [patients.id],
  }),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one }) => ({
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
}));
