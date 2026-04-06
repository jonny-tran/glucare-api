import { relations } from 'drizzle-orm';
import {
  boolean,
  customType,
  date,
  decimal,
  integer,
  json,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * E-12 RAG — kích thước cột `knowledge_articles.embedding` (pgvector).
 * Khớp `outputDimensionality` khi gọi Gemini embedding (vd. gemini-embedding-001 cắt về 768).
 */
export const KNOWLEDGE_EMBEDDING_DIMENSION = 768 as const;

/**
 * PostgreSQL type `vector` comes from extension **pgvector**.
 * Run `CREATE EXTENSION IF NOT EXISTS vector` before first `ALTER` on this column
 * (use `pnpm db:ensure-pgvector` or `pnpm db:push`, which runs it automatically).
 */
const vectorEmbedding = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return `vector(${KNOWLEDGE_EMBEDDING_DIMENSION})`;
  },
});

// --- 1. ENUMS DEFINITION (Source of Truth) ---
export enum UserRole {
  ADMIN = 'ADMIN',
  DOCTOR = 'DOCTOR',
  PATIENT = 'PATIENT',
}
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'DOCTOR', 'PATIENT']);
export const genderEnum = pgEnum('gender', ['M', 'F', 'O']);

// Admin: User account status management
export const userStatusEnum = pgEnum('user_status', [
  'PENDING',
  'ACTIVE',
  'BLOCKED',
]);
export const subscriptionTierEnum = pgEnum('subscription_tier', [
  'TRIAL',
  'MONTHLY',
  'YEARLY',
  'LIFETIME',
]);

// Blog: Article language
export const articleLanguageEnum = pgEnum('article_language', ['VI', 'EN']);

// SystemConfig: Key enum
export const systemConfigKeyEnum = pgEnum('system_config_key', [
  'GLUCOSE_SAFE_MIN',
  'GLUCOSE_SAFE_MAX',
]);

// Dashboard: AI feature tracking
export const aiFeatureEnum = pgEnum('ai_feature', ['VOICE', 'OCR']);
export const aiRequestStatusEnum = pgEnum('ai_request_status', [
  'SUCCESS',
  'FAILED',
]);
export const diabetesTypeEnum = pgEnum('diabetes_type', ['GDM', 'T1D', 'T2D']);

// E-03, E-10: Status kết nối
export const connectionStatusEnum = pgEnum('connection_status', [
  'PENDING',
  'ACTIVE',
  'REJECTED',
  'CANCELLED',
]);

// E-04: Glucose
// E-04: Glucose
export const readingTypeEnum = pgEnum('reading_type', [
  'CGM',
  'SMBG',
  'MANUAL',
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
  'MEDICINE',
  'MEASUREMENT',
]);

// E-13: Chat Session
export const sessionTypeEnum = pgEnum('session_type', ['AI', 'Doctor']);
export const chatStatusEnum = pgEnum('chat_status', ['Active', 'Closed']);
export const chatMessageRoleEnum = pgEnum('chat_message_role', [
  'user',
  'assistant',
  'system',
  'tool',
]);

// E-07: Exercise
export const intensityLevelEnum = pgEnum('intensity_level', [
  'LOW',
  'MEDIUM',
  'HIGH',
]);

// E-08: Appointment
export const appointmentStatusEnum = pgEnum('appointment_status', [
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
]);

// --- 2. CORE TABLES ---

// E-01 & E-02 Base User
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  phoneNumber: text('phone_number').unique(),
  email: text('email').unique(),
  password: text('password').notNull(),
  role: userRoleEnum('role').default('PATIENT').notNull(),
  subscriptionTier: subscriptionTierEnum('subscription_tier')
    .default('TRIAL')
    .notNull(), // TRIAL, MONTHLY, YEARLY, LIFETIME
  subscriptionExpiry: timestamp('subscription_expiry'),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  status: userStatusEnum('status').default('ACTIVE').notNull(),
  hashedRefreshToken: text('hashed_refresh_token'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
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

// E-05: Meals
export const meals = pgTable('meals', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  foodName: text('food_name').notNull(),
  mealType: mealTypeEnum('meal_type').notNull(),
  calories: decimal('calories', { precision: 5, scale: 2 }),
  carbs: decimal('carbs', { precision: 5, scale: 2 }), // grams
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
  notes: text('notes'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// E-06: Medications (Log)
export const medications = pgTable('medications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  medicineName: text('medicine_name').notNull(), // text
  dosage: decimal('dosage', { precision: 5, scale: 2 }),
  unit: text('unit'),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
  notes: text('notes'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// E-14: Transactions (SePay reconciliation history)
export const transactions = pgTable('transactions', {
  // Use SePay transaction UUID directly
  id: uuid('id').primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  transferType: varchar('transfer_type', { length: 10 }).notNull(), // in | out
  gateway: varchar('gateway', { length: 100 }),
  transactionContent: text('transaction_content'),
  referenceCode: varchar('reference_code', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// E-04: Glucose Readings
export const glucoseReadings = pgTable('glucose_readings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  glucoseValue: decimal('glucose_value', { precision: 5, scale: 2 }).notNull(), // mg/dL
  readingType: readingTypeEnum('reading_type').default('MANUAL').notNull(),
  mealContext: mealContextEnum('meal_context').notNull(),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
  notes: text('notes'),
  medicationId: uuid('medication_id').references(() => medications.id, {
    onDelete: 'set null',
  }),
  mealId: uuid('meal_id').references(() => meals.id, {
    onDelete: 'set null',
  }),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// REMOVED E-07 medicationLogs as it is merged into medications

// --- 4. CONNECTION & SHARING (Giai đoạn 2) ---

// E-03: Patient-Doctor Relationship (Quản lý kết nối)
export const patientDoctors = pgTable(
  'patient_doctors',
  {
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
  },
  (t) => ({
    unq: uniqueIndex('patient_doctors_unq').on(t.patientId, t.doctorId),
  }),
);

// E-08: Doctor Notes (Ghi chú của bác sĩ về bệnh nhân)
export const doctorNotes = pgTable('doctor_notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  doctorId: uuid('doctor_id')
    .references(() => doctors.id, { onDelete: 'cascade' })
    .notNull(),
  patientId: uuid('patient_id')
    .references(() => patients.id, { onDelete: 'cascade' })
    .notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
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
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  medicationId: uuid('medication_id').references(() => medications.id, {
    onDelete: 'set null',
  }),
  title: text('title').notNull(),
  type: reminderTypeEnum('type').notNull(),
  time: text('time').notNull(), // "HH:mm"
  daysOfWeek: json('days_of_week').$type<number[]>(), // [0, 1, 2...6] (Sunday to Saturday)
  timezone: text('timezone').default('Asia/Ho_Chi_Minh'),
  isActive: boolean('is_active').default(true),
  deletedAt: timestamp('deleted_at'),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Notification Tokens
export const notificationTokens = pgTable('notification_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  fcmToken: text('fcm_token').unique().notNull(),
  deviceType: text('device_type'), // e.g., 'ios', 'android'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
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

// --- NEW: ADMIN TABLES ---

// Categories (Blog/Knowledge Base)
export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// E-12: Knowledge Articles (Revamped with FK to categories)
export const knowledgeArticles = pgTable('knowledge_articles', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  categoryId: uuid('category_id')
    .references(() => categories.id)
    .notNull(),
  thumbnailUrl: text('thumbnail_url'),
  language: articleLanguageEnum('language').notNull(),
  isPublished: boolean('is_published').default(false).notNull(),
  viewCount: integer('view_count').default(0).notNull(),
  /** Semantic search (pgvector); null until backfilled */
  embedding: vectorEmbedding('embedding'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// System Configs (Key-Value Store for medical standards)
export const systemConfigs = pgTable('system_configs', {
  key: systemConfigKeyEnum('key').primaryKey(),
  value: jsonb('value').notNull(),
  description: text('description'),
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// AI Usage Logs (Dashboard tracking)
export const aiUsageLogs = pgTable('ai_usage_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  feature: aiFeatureEnum('feature').notNull(),
  status: aiRequestStatusEnum('status').notNull(),
  errorMessage: text('error_message'),
  durationMs: integer('duration_ms'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// E-13: ChatSession
export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  sessionType: sessionTypeEnum('session_type').notNull(),
  status: chatStatusEnum('status').default('Active').notNull(),
  summary: text('summary'),
  context: jsonb('context').$type<Record<string, unknown>>(),
  title: varchar('title', { length: 255 })
    .notNull()
    .default('Cuộc trò chuyện mới'),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id')
    .references(() => chatSessions.id, { onDelete: 'cascade' })
    .notNull(),
  role: chatMessageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- 6. EXERCISES & APPOINTMENTS ---

// E-07: Exercises (Nhật ký vận động)
export const exercises = pgTable('exercises', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  exerciseType: text('exercise_type').notNull(), // e.g., Walking, Running, Gym
  duration: integer('duration').notNull(), // đơn vị: phút
  intensity: intensityLevelEnum('intensity').notNull(),
  caloriesBurned: decimal('calories_burned', { precision: 6, scale: 2 }),
  startTime: timestamp('start_time').notNull(),
  notes: text('notes'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// E-08: Appointments (Lịch hẹn tái khám)
export const appointments = pgTable('appointments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  doctorId: uuid('doctor_id')
    .references(() => doctors.id, { onDelete: 'cascade' })
    .notNull(),
  appointmentDate: timestamp('appointment_date').notNull(),
  status: appointmentStatusEnum('status').default('PENDING').notNull(),
  reason: text('reason'), // Lý do hủy hoặc ghi chú
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- 7. RELATIONS ---

export const usersRelations = relations(users, ({ one, many }) => ({
  patient: one(patients, { fields: [users.id], references: [patients.userId] }),
  doctor: one(doctors, { fields: [users.id], references: [doctors.userId] }),
  chatSessions: many(chatSessions),
  transactions: many(transactions),
  glucoseReadings: many(glucoseReadings),
  meals: many(meals),
  medications: many(medications),
  reminders: many(reminders),
  notificationTokens: many(notificationTokens),
  aiUsageLogs: many(aiUsageLogs),
  exercises: many(exercises),
  appointments: many(appointments),
}));

// Categories <-> Articles
export const categoriesRelations = relations(categories, ({ many }) => ({
  articles: many(knowledgeArticles),
}));

export const knowledgeArticlesRelations = relations(
  knowledgeArticles,
  ({ one }) => ({
    category: one(categories, {
      fields: [knowledgeArticles.categoryId],
      references: [categories.id],
    }),
  }),
);

// AI Usage Logs
export const aiUsageLogsRelations = relations(aiUsageLogs, ({ one }) => ({
  user: one(users, {
    fields: [aiUsageLogs.userId],
    references: [users.id],
  }),
}));

export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  user: one(users, { fields: [doctors.userId], references: [users.id] }),
  patients: many(patientDoctors),
  notes: many(doctorNotes),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  user: one(users, { fields: [patients.userId], references: [users.id] }),
  doctors: many(patientDoctors),
  devices: many(devices),
  healthReports: many(healthReports),
  notes: many(doctorNotes),
}));

// ...

export const mealsRelations = relations(meals, ({ one, many }) => ({
  user: one(users, {
    fields: [meals.userId],
    references: [users.id],
  }),
  glucoseReadings: many(glucoseReadings),
}));

export const medicationsRelations = relations(medications, ({ one, many }) => ({
  user: one(users, {
    fields: [medications.userId],
    references: [users.id],
  }),
  glucoseReadings: many(glucoseReadings),
  reminders: many(reminders),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));

// Update glucoseReadingsRelations to include meals and medications if needed,
// but usually one-to-many from user is fine.
// However, glucoseReadings has FKs to them.
export const glucoseReadingsRelations = relations(
  glucoseReadings,
  ({ one }) => ({
    user: one(users, {
      fields: [glucoseReadings.userId],
      references: [users.id],
    }),
    meal: one(meals, {
      fields: [glucoseReadings.mealId],
      references: [meals.id],
    }),
    medication: one(medications, {
      fields: [glucoseReadings.medicationId],
      references: [medications.id],
    }),
  }),
);

export const healthReportsRelations = relations(healthReports, ({ one }) => ({
  patient: one(patients, {
    fields: [healthReports.patientId],
    references: [patients.id],
  }),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  user: one(users, {
    fields: [reminders.userId],
    references: [users.id],
  }),
  medication: one(medications, {
    fields: [reminders.medicationId],
    references: [medications.id],
  }),
}));

export const notificationTokensRelations = relations(
  notificationTokens,
  ({ one }) => ({
    user: one(users, {
      fields: [notificationTokens.userId],
      references: [users.id],
    }),
  }),
);

// E-07: Exercises Relations
export const exercisesRelations = relations(exercises, ({ one }) => ({
  user: one(users, {
    fields: [exercises.userId],
    references: [users.id],
  }),
}));

// E-08: Appointments Relations
export const appointmentsRelations = relations(appointments, ({ one }) => ({
  user: one(users, {
    fields: [appointments.userId],
    references: [users.id],
  }),
  doctor: one(doctors, {
    fields: [appointments.doctorId],
    references: [doctors.id],
  }),
}));
