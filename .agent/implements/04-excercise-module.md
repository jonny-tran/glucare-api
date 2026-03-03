# IMPLEMENTATION SPECIFICATION: EXERCISE MODULE (E-07)

## 1. Tổng quan (Overview)

- **Mã thực thể:** E-07 (Exercise).
- **Mục tiêu:** Cho phép người dùng (Patient) ghi lại hoạt động thể chất để phân tích sự ảnh hưởng của vận động đến chỉ số đường huyết.
- **Tech Stack:** NestJS, Drizzle ORM, NeonDB (PostgreSQL), Class-validator, Swagger.

## 2. Database Schema (Drizzle ORM)

```typescript
import {
  pgTable,
  serial,
  integer,
  varchar,
  decimal,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { users } from './users'; // Reference to E-01

// Định nghĩa Enum cho cường độ vận động
export const intensityEnum = pgEnum('intensity_level', [
  'Low',
  'Medium',
  'High',
]);

export const exercises = pgTable('exercises', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  exerciseType: varchar('exercise_type', { length: 100 }).notNull(), // Ví dụ: Walking, Running, Gym
  duration: integer('duration').notNull(), // Đơn vị: Phút
  intensity: intensityEnum('intensity').notNull(),
  caloriesBurned: decimal('calories_burned', { precision: 6, scale: 2 }),
  startTime: timestamp('start_time').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

## 3. Data Transfer Objects (DTOs)

Sử dụng `class-validator` để đảm bảo dữ liệu sạch.

### 3.1. CreateExerciseDto

```typescript
export class CreateExerciseDto {
  @ApiProperty({ example: 'Running', description: 'Loại hình vận động' })
  @IsString()
  @IsNotEmpty()
  exerciseType: string;

  @ApiProperty({ example: 45, description: 'Thời gian tập luyện (phút)' })
  @IsInt()
  @Min(1)
  duration: number;

  @ApiProperty({ enum: ['Low', 'Medium', 'High'], example: 'Medium' })
  @IsEnum(['Low', 'Medium', 'High'])
  intensity: 'Low' | 'Medium' | 'High';

  @ApiProperty({
    example: 300.5,
    required: false,
    description: 'Lượng calo tiêu thụ',
  })
  @IsNumber()
  @IsOptional()
  caloriesBurned?: number;

  @ApiProperty({
    example: '2024-03-20T08:00:00Z',
    description: 'Thời điểm bắt đầu tập',
  })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;
}
```

### 3.2. ExerciseFilterDto (Phân trang & Lọc)

```typescript
export class ExerciseFilterDto extends PaginationQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
```

## 4. API Endpoints (Controller)

Giao diện Swagger phải được mô tả đầy đủ qua `@ApiOperation`.

| Method     | Endpoint                     | Role          | Description                                               |
| ---------- | ---------------------------- | ------------- | --------------------------------------------------------- |
| **POST**   | `/exercises`                 | Patient       | Ghi lại hoạt động vận động mới.                           |
| **GET**    | `/exercises`                 | Patient       | Lấy danh sách vận động cá nhân (Phân trang).              |
| **GET**    | `/exercises/patient/:userId` | Doctor, Admin | Xem lịch sử vận động của bệnh nhân cụ thể (Nếu có quyền). |
| **PATCH**  | `/exercises/:id`             | Patient       | Cập nhật thông tin vận động.                              |
| **DELETE** | `/exercises/:id`             | Patient       | Xóa bản ghi vận động.                                     |

## 5. Business Logic & Repository (Service)

Cần tuân thủ chặt chẽ tính kỷ luật dữ liệu:

1. **Ownership Check:** Trong `update` và `delete`, service PHẢI kiểm tra `exercise.userId === currentUser.id`. Nếu không khớp, ném `ForbiddenException`.
2. **Calorie Calculation (Optional):** Nếu `caloriesBurned` không được cung cấp, Service có thể tính toán sơ bộ dựa trên `duration` và `intensity` (Logic này có thể add thêm sau nhưng cần giữ placeholder).
3. **Data Integration:** Sau khi `create` thành công, bản ghi này sẽ là input cho `GlucoseAnalyticsService` để tính toán xu hướng đường huyết trong tương lai.

## 6. Swagger & Clean Code

- Mọi Endpoint phải có `@ApiResponse` cho các case 200, 201, 400, 403.
- Sử dụng `TransformInterceptor` để format output đồng nhất.
- Repository Pattern: Tách biệt logic truy vấn Drizzle ra khỏi Service để dễ Unit Test.
