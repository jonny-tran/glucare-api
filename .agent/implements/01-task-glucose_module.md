# 📘 PHASE 1 TECHNICAL SPECIFICATION: HEALTH DATA CORE & ANALYTICS

**Document ID:** SPEC-PHASE-1-GLUCOSE
**Status:** READY FOR IMPLEMENTATION
**Target Agent:** Antigravity (NestJS Expert)
**Source of Truth:** `docs/05-entities-schema.md` (E-04), `docs/04-requirements.md` (FR-01, FR-04)

---

## 🎯 1. Overview & Architecture Standards

Giai đoạn này tập trung xây dựng module quan trọng nhất: **Glucose Management**. Đây là dữ liệu nền tảng cho mọi tính năng AI sau này.

### 🛑 Strict Implementation Rules

1. **Architecture:** `DTO` -> `Repository` (Drizzle) -> `Service` (Business Logic) -> `Controller` (HTTP).
2. **Database:** Tất cả Primary Key phải là **UUIDv4**.
3. **Security:**

- Mọi Endpoint phải được bảo vệ bởi `@UseGuards(JwtAuthGuard, RolesGuard)`.
- Chỉ `Role.PATIENT` mới được quyền ghi dữ liệu.
- Luôn sử dụng decorator `@CurrentUser()` để lấy `userId` (tránh ID Injection attack).

4. **Validation:** Sử dụng `class-validator` cực kỳ nghiêm ngặt (chặn giá trị âm, chặn giá trị vô lý > 600mg/dL).

---

## 🗄️ 2. Database Schema (Drizzle ORM)

_File target: `src/database/schema.ts_`

Cần đảm bảo table `glucose_readings` (E-04) được định nghĩa chính xác như sau:

```typescript
// Enums bắt buộc (Khớp với 05-entities-schema.md)
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

export const glucoseReadings = pgTable('glucose_readings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(), // Foreign Key
  glucoseValue: decimal('glucose_value', { precision: 5, scale: 2 }).notNull(), // Đơn vị: mg/dL
  readingType: readingTypeEnum('reading_type').default('MANUAL').notNull(),
  mealContext: mealContextEnum('meal_context').notNull(), // BẮT BUỘC có ngữ cảnh
  notes: text('notes'),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(), // Thời gian đo thực tế
  createdAt: timestamp('created_at').defaultNow(),
});
```

---

## 📦 3. Data Transfer Objects (DTOs) specification

_File target: `src/modules/glucose/dto/_.dto.ts\*`

### 3.1. CreateGlucoseDto

```typescript
export class CreateGlucoseDto {
  @ApiProperty({ example: 120, description: 'Glucose level in mg/dL' })
  @IsNumber()
  @Min(20, { message: 'Glucose value too low (min 20)' })
  @Max(600, { message: 'Glucose value too high (max 600)' })
  glucoseValue: number;

  @ApiProperty({ enum: ReadingType, default: 'MANUAL' })
  @IsEnum(ReadingType)
  readingType: ReadingType;

  @ApiProperty({ enum: MealContext, example: 'FASTING' })
  @IsEnum(MealContext)
  mealContext: MealContext;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: '2023-10-27T07:00:00Z' })
  @IsISO8601()
  recordedAt: string;
}
```

### 3.2. GlucoseFilterDto (Query Params)

```typescript
export class GlucoseFilterDto {
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsEnum(MealContext) mealContext?: MealContext;
  @IsOptional() @IsNumber() @Min(1) page?: number = 1;
  @IsOptional() @IsNumber() @Min(1) limit?: number = 10;
}
```

---

## 🧠 4. Analytics Engine (Business Logic)

_File target: `src/modules/glucose/services/analytics.service.ts_`

Service này chịu trách nhiệm tính toán các chỉ số y tế (FR-04). Không viết logic này trong Controller.

### 4.1. Công thức tính toán (Medical Formulas)

| Metric                     | Công thức / Logic                         | Implementation Note                                                                                                                                    |
| -------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **TIR** (Time In Range)    | `(Count(70 <= val <= 180) / Total) * 100` | Trả về 0 nếu Total = 0. Làm tròn 1 chữ số thập phân.                                                                                                   |
| **TBR** (Time Below Range) | `(Count(val < 70) / Total) * 100`         | Cảnh báo Hypoglycemia (Hạ đường huyết).                                                                                                                |
| **TAR** (Time Above Range) | `(Count(val > 180) / Total) * 100`        | Cảnh báo Hyperglycemia (Tăng đường huyết).                                                                                                             |
| **eHbA1c** (Estimated)     | `(AverageGlucose + 46.7) / 28.7`          | Chỉ tính khi có > 10 bản ghi trong 14 ngày gần nhất để đảm bảo độ chính xác (BR-09). Nếu ít dữ liệu, trả về `null` hoặc flag `insufficientData: true`. |
| **Status Label**           | Dựa trên `glucoseValue`                   | `LOW` (<70), `NORMAL` (70-180), `HIGH` (>180), `DANGEROUS` (>250).                                                                                     |

---

## 🔌 5. API Endpoints Specification

_File target: `src/modules/glucose/glucose.controller.ts_`

Toàn bộ Endpoint nằm dưới prefix `/glucose`.

### 5.1. Log Glucose Reading

- **Method:** `POST /`
- **Body:** `CreateGlucoseDto`
- **Logic:**

1. Validate input.
2. Inject `userId` từ token vào DTO.
3. Gọi Repository save.
4. Return: Object vừa tạo + ID.

### 5.2. Get Dashboard Overview (Home Screen Data)

- **Method:** `GET /dashboard`
- **Response Structure:**

```json
{
  "latestReading": {
    "value": 126,
    "unit": "mg/dL",
    "context": "FASTING",
    "recordedAt": "..."
  },
  "todayAvg": 130,
  "status": "NORMAL", // Based on latest reading
  "trend": "STABLE", // So sánh trung bình hôm nay vs hôm qua
  "stats": { "min": 90, "max": 150 }
}
```

### 5.3. Get Analytics Report (Reports Screen)

- **Method:** `GET /analytics`
- **Query:** `?days=7` (hoặc 14, 30)
- **Response Structure:**

```json
{
  "tir": 75.5, // Percent
  "tar": 20.0,
  "tbr": 4.5,
  "estimatedHbA1c": 6.2,
  "totalReadings": 45,
  "isSparseData": false // True nếu readings < 5/ngày
}
```

### 5.4. Get History (Logbook)

- **Method:** `GET /`
- **Query:** `GlucoseFilterDto`
- **Logic:** Paginate kết quả, sort theo `recordedAt` DESC.

---

## 🧪 6. Testing Requirements (Test Suite)

_File target: `test/glucose.e2e-spec.ts` & `src/modules/glucose/glucose.service.spec.ts_`

### Unit Tests (Service Layer)

1. **calculateTIR:** Input `[60, 100, 200]`. Expect `TIR = 33.3%`, `TBR = 33.3%`, `TAR = 33.3%`.
2. **calculateHbA1c:** Input Avg `126`. Expect `(126 + 46.7)/28.7 = 6.01%`.
3. **Validation:** Input `glucoseValue = -10` -> Throw Error.

### E2E Tests (Controller Layer)

1. **Auth Guard:** Gọi API không kèm Token -> Expect `401 Unauthorized`.
2. **Data Isolation:** User A gọi `GET /glucose` -> Chỉ nhận dữ liệu của User A (Count check).
3. **Data Integrity:** Create Reading `150` -> Get Dashboard -> `latestReading` phải là `150`.

---

## ✅ 7. Architect's Checklist for Antigravity

Dưới đây là danh sách Task cần thực hiện ngay lập tức:

- [ ] **Step 1:** Review & Fix `src/database/schema.ts` (Đảm bảo Enum & Type Decimal chính xác).
- [ ] **Step 2:** Generate `GlucoseModule`, `GlucoseController`, `GlucoseService`.
- [ ] **Step 3:** Implement `CreateGlucoseDto` với full Validation Decorators.
- [ ] **Step 4:** Implement `GlucoseRepository` (Drizzle operations).
- [ ] **Step 5:** Implement `AnalyticsService` logic (TIR/HbA1c formulas).
- [ ] **Step 6:** Wire up Controller Endpoints & Swagger Tags.
- [ ] **Step 7:** Run `pnpm test` để verify logic.
