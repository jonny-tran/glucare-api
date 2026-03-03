## Structure of the Master Implementation Specification:

1. Overview (Tổng quan)
2. Database Schema Definition (Định nghĩa Schema - Drizzle ORM)
3. Data Transfer Objects (DTOs)
4. Repository Layer
5. Service Layer (Business Logic)
6. Controller Layer
7. Module Registration

### 1. Overview

- Code: E-08
- Goal: Manage appointments between Patients and Doctors.
- Key constraint: Must have an active connection in PatientDoctor.
- Status enum: Pending, Confirmed, Cancelled, Completed.

### 2. Schema

Need `appointments` table and `appointmentStatusEnum`.

### 3. DTOs

- `CreateAppointmentDto`
- `UpdateAppointmentStatusDto`
- `AppointmentFilterDto`

### 4. Repository Layer

Abstract DB calls. `create`, `findAll` (needs conditional logic based on role), `findById`, `updateStatus`.

### 5. Service Layer

- `create`: Check `PatientDoctor` connection status. If not Active, throw `Forbidden`. Also check for overlapping `Pending` or `Confirmed` appointments for the same `userId` within +/- 30 mins.
- `findAll`: Filter by userId or doctorId.
- `updateStatus`: State transition logic.
- Patient can cancel.
- Doctor can confirm, cancel, complete.
- Reason required for cancel.
- Fire events for notifications.

### 6. Controller Layer

- Endpoints for Patient and Doctor with appropriate roles and decorators.

### 7. Module

Registers providers, controllers. Includes `EventEmitter2` imports if needed.

# MASTER IMPLEMENTATION SPECIFICATION: APPOINTMENT MODULE (E-08)

## 1. Tổng quan (Overview)

- **Mã thực thể:** E-08 (Appointment).
- **Mục tiêu:** Quản lý quy trình đặt lịch, xác nhận và hoàn tất tái khám giữa Bệnh nhân (Patient) và Bác sĩ (Doctor).
- **Kiến trúc:** NestJS Modular Architecture.
- **Tech Stack:** NestJS, Drizzle ORM, PostgreSQL, `class-validator`, `@nestjs/swagger`, `EventEmitter2`.

---

## 2. Database Schema (Drizzle ORM)

> **Quy chiếu:** Bảng `E-08` trong file `6.Entities.csv`.

- **File:** `src/database/schema.ts` (Hoặc file schema riêng của module tùy chuẩn project).

```typescript
import {
  pgTable,
  serial,
  integer,
  timestamp,
  varchar,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { users } from './users'; // E-01
import { doctors } from './doctors'; // E-02

export const appointmentStatusEnum = pgEnum('appointment_status', [
  'Pending',
  'Confirmed',
  'Cancelled',
  'Completed',
]);

export const appointments = pgTable('appointments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  doctorId: integer('doctor_id')
    .references(() => doctors.id, { onDelete: 'cascade' })
    .notNull(),
  appointmentDate: timestamp('appointment_date').notNull(),
  status: appointmentStatusEnum('status').default('Pending').notNull(),
  reason: varchar('reason', { length: 255 }), // Lý do hủy (nếu có)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

## 3. Data Transfer Objects (DTOs)

> **Thư mục:** `src/modules/appointments/dto/`

### 3.1. `create-appointment.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsDateString, IsNotEmpty, IsFuture } from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({ example: 2, description: 'ID của Bác sĩ muốn đặt lịch' })
  @IsInt()
  @IsNotEmpty()
  doctorId: number;

  @ApiProperty({
    example: '2024-05-20T09:00:00Z',
    description: 'Thời gian khám (phải ở tương lai)',
  })
  @IsDateString()
  @IsNotEmpty()
  // @IsFuture() // Custom validator để đảm bảo không đặt lịch trong quá khứ
  appointmentDate: string;
}
```

### 3.2. `update-appointment-status.dto.ts`

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional, ValidateIf } from 'class-validator';

export class UpdateAppointmentStatusDto {
  @ApiProperty({
    enum: ['Confirmed', 'Cancelled', 'Completed'],
    example: 'Confirmed',
  })
  @IsEnum(['Confirmed', 'Cancelled', 'Completed'])
  status: 'Confirmed' | 'Cancelled' | 'Completed';

  @ApiPropertyOptional({
    example: 'Bác sĩ có việc bận đột xuất',
    description: 'Bắt buộc nếu status là Cancelled',
  })
  @ValidateIf((o) => o.status === 'Cancelled')
  @IsString()
  @IsNotEmpty({ message: 'Lý do hủy là bắt buộc khi trạng thái là Cancelled' })
  reason?: string;
}
```

### 3.3. `appointment-filter.dto.ts`

```typescript
import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AppointmentFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: ['Pending', 'Confirmed', 'Cancelled', 'Completed'],
  })
  @IsOptional()
  @IsEnum(['Pending', 'Confirmed', 'Cancelled', 'Completed'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
```

---

## 4. Repository Layer

> **Thư mục:** `src/modules/appointments/appointments.repository.ts`

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../database/database.module';
import { appointments } from '../../database/schema';
import { eq, and, or, gte, lte, desc } from 'drizzle-orm';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentFilterDto } from './dto/appointment-filter.dto';

@Injectable()
export class AppointmentsRepository {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: NodePgDatabase<any>,
  ) {}

  async create(userId: number, data: CreateAppointmentDto) {
    const [result] = await this.db
      .insert(appointments)
      .values({
        userId,
        doctorId: data.doctorId,
        appointmentDate: new Date(data.appointmentDate),
      })
      .returning();
    return result;
  }

  async findById(id: number) {
    const [result] = await this.db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id));
    return result;
  }

  // Lấy lịch hẹn trong một khoảng thời gian của 1 user (dùng để check overlap)
  async findOverlapping(userId: number, startTime: Date, endTime: Date) {
    return this.db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.userId, userId),
          or(
            eq(appointments.status, 'Pending'),
            eq(appointments.status, 'Confirmed'),
          ),
          gte(appointments.appointmentDate, startTime),
          lte(appointments.appointmentDate, endTime),
        ),
      );
  }

  async updateStatus(id: number, status: string, reason?: string) {
    const [result] = await this.db
      .update(appointments)
      .set({
        status: status as any,
        reason: reason || null,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, id))
      .returning();
    return result;
  }
}
```

---

## 5. Service Layer (Business Rules & Logic)

> **Thư mục:** `src/modules/appointments/appointments.service.ts`

- **Cực kỳ quan trọng:** Phải inject `PatientDoctorRepository` (hoặc Service tương đương) để check quyền.

```typescript
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AppointmentsRepository } from './appointments.repository';
import { ConnectionsRepository } from '../connections/connections.repository'; // Assume this exists for E-03
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly appointmentsRepo: AppointmentsRepository,
    private readonly connectionsRepo: ConnectionsRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(userId: number, dto: CreateAppointmentDto) {
    // 1. Kiểm tra kết nối Patient - Doctor (FR-05)
    const connection = await this.connectionsRepo.findConnection(
      userId,
      dto.doctorId,
    );
    if (!connection || connection.status !== 'Active') {
      throw new ForbiddenException(
        'Bạn chưa kết nối hoặc kết nối không hoạt động với bác sĩ này.',
      );
    }

    // 2. Kiểm tra chồng chéo lịch hẹn (Anti-overlap: +/- 30 minutes)
    const aptDate = new Date(dto.appointmentDate);
    const thirtyMinsBefore = new Date(aptDate.getTime() - 30 * 60000);
    const thirtyMinsAfter = new Date(aptDate.getTime() + 30 * 60000);

    const overlaps = await this.appointmentsRepo.findOverlapping(
      userId,
      thirtyMinsBefore,
      thirtyMinsAfter,
    );
    if (overlaps.length > 0) {
      throw new BadRequestException(
        'Bạn đã có lịch hẹn khác trùng hoặc quá gần thời gian này.',
      );
    }

    const appointment = await this.appointmentsRepo.create(userId, dto);

    // 3. Bắn event thông báo cho Bác sĩ
    this.eventEmitter.emit('appointment.created', { appointment });

    return appointment;
  }

  async updateStatus(
    id: number,
    userId: number,
    role: 'Patient' | 'Doctor',
    dto: UpdateAppointmentStatusDto,
  ) {
    const appointment = await this.appointmentsRepo.findById(id);
    if (!appointment) throw new NotFoundException('Không tìm thấy lịch hẹn.');

    // Phân quyền state machine
    if (role === 'Patient') {
      if (appointment.userId !== userId)
        throw new ForbiddenException('Truy cập bị từ chối.');
      if (dto.status !== 'Cancelled')
        throw new ForbiddenException('Bệnh nhân chỉ có quyền hủy lịch.');
    } else if (role === 'Doctor') {
      if (appointment.doctorId !== userId)
        throw new ForbiddenException('Truy cập bị từ chối.');
    }

    const updated = await this.appointmentsRepo.updateStatus(
      id,
      dto.status,
      dto.reason,
    );

    // Bắn event tương ứng để trigger push notification
    if (dto.status === 'Confirmed') {
      this.eventEmitter.emit('appointment.confirmed', { appointment: updated });
    } else if (dto.status === 'Cancelled') {
      this.eventEmitter.emit('appointment.cancelled', {
        appointment: updated,
        by: role,
      });
    }

    return updated;
  }
}
```

---

## 6. Controller Layer

> **Thư mục:** `src/modules/appointments/appointments.controller.ts`

```typescript
import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Appointments')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles('Patient')
  @ApiOperation({ summary: 'Patient tạo yêu cầu đặt lịch hẹn mới' })
  create(@CurrentUser('id') userId: number, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(userId, dto);
  }

  @Patch(':id/status')
  @Roles('Patient', 'Doctor')
  @ApiOperation({
    summary: 'Cập nhật trạng thái lịch hẹn (Confirm, Cancel, Complete)',
  })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.appointmentsService.updateStatus(id, user.id, user.role, dto);
  }
}
```

---

## 7. Module Registration & Integration

> **Thư mục:** `src/modules/appointments/appointments.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsRepository } from './appointments.repository';
import { ConnectionsModule } from '../connections/connections.module'; // Chứa repository check kết nối

@Module({
  imports: [ConnectionsModule], // Bắt buộc import để dùng được ConnectionsRepository
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentsRepository],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
```

# MASTER IMPLEMENTATION SPECIFICATION: APPOINTMENT MODULE (E-08)

## 1. Tổng quan (Overview)

- **Mã thực thể:** E-08 (Appointment).
- **Mục tiêu:** Quản lý quy trình đặt lịch, xác nhận, hủy và hoàn tất tái khám giữa Bệnh nhân (Patient) và Bác sĩ (Doctor).
- **Kiến trúc:** NestJS Modular Architecture.
- **Tech Stack:** NestJS, Drizzle ORM, PostgreSQL (NeonDB), `class-validator`, `@nestjs/swagger`, `EventEmitter2` (cho tính năng notification).

---

## 2. Database Schema Definition (Drizzle ORM)

> **Quy chiếu:** Dựa trên thực thể `E-08` trong file `6.Entities.csv`.

- **File Location:** `src/database/schema.ts` (Hoặc thêm vào file gom schema chính của project).

```typescript
import {
  pgTable,
  serial,
  integer,
  timestamp,
  varchar,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { users } from './users'; // Reference E-01
import { doctors } from './doctors'; // Reference E-02

// Định nghĩa Enum cho các trạng thái lịch hẹn
export const appointmentStatusEnum = pgEnum('appointment_status', [
  'Pending',
  'Confirmed',
  'Cancelled',
  'Completed',
]);

export const appointments = pgTable('appointments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  doctorId: integer('doctor_id')
    .references(() => doctors.id, { onDelete: 'cascade' })
    .notNull(),
  appointmentDate: timestamp('appointment_date').notNull(),
  status: appointmentStatusEnum('status').default('Pending').notNull(),
  reason: varchar('reason', { length: 255 }), // Lý do hủy lịch hoặc ghi chú
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

_Lưu ý: Sau khi thêm schema này, bắt buộc phải chạy `drizzle-kit push` hoặc generate migrations._

---

## 3. Data Transfer Objects (DTOs)

> **Thư mục:** `src/modules/appointments/dto/`

### 3.1. `create-appointment.dto.ts`

Dùng cho Patient khi gửi yêu cầu đặt lịch mới.

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsDateString } from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({ example: 2, description: 'ID của Bác sĩ muốn đặt lịch' })
  @IsInt()
  @IsNotEmpty()
  doctorId: number;

  @ApiProperty({
    example: '2024-12-15T09:00:00Z',
    description: 'Thời gian tái khám (UTC ISO 8601)',
  })
  @IsDateString()
  @IsNotEmpty()
  appointmentDate: string;
}
```

### 3.2. `update-appointment-status.dto.ts`

Dùng cho cả Doctor và Patient để cập nhật trạng thái lịch hẹn.

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, IsNotEmpty, ValidateIf } from 'class-validator';

export class UpdateAppointmentStatusDto {
  @ApiProperty({
    enum: ['Confirmed', 'Cancelled', 'Completed'],
    example: 'Confirmed',
  })
  @IsEnum(['Confirmed', 'Cancelled', 'Completed'])
  status: 'Confirmed' | 'Cancelled' | 'Completed';

  @ApiPropertyOptional({
    example: 'Bác sĩ có ca mổ cấp cứu đột xuất',
    description: 'Bắt buộc phải có lý do nếu status là Cancelled',
  })
  @ValidateIf((o) => o.status === 'Cancelled')
  @IsString()
  @IsNotEmpty({
    message:
      'Lý do hủy là bắt buộc (reason required) khi trạng thái là Cancelled',
  })
  reason?: string;
}
```

### 3.3. `appointment-filter.dto.ts`

```typescript
import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto'; // Kế thừa chuẩn phân trang chung
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AppointmentFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: ['Pending', 'Confirmed', 'Cancelled', 'Completed'],
  })
  @IsOptional()
  @IsEnum(['Pending', 'Confirmed', 'Cancelled', 'Completed'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
```

---

## 4. Repository Layer

> **Thư mục:** `src/modules/appointments/appointments.repository.ts`
> Đóng gói mọi truy vấn Drizzle tại đây.

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../database/database.module';
import { appointments } from '../../database/schema';
import { eq, and, or, gte, lte, desc } from 'drizzle-orm';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentFilterDto } from './dto/appointment-filter.dto';

@Injectable()
export class AppointmentsRepository {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: NodePgDatabase<any>,
  ) {}

  async create(userId: number, data: CreateAppointmentDto) {
    const [result] = await this.db
      .insert(appointments)
      .values({
        userId,
        doctorId: data.doctorId,
        appointmentDate: new Date(data.appointmentDate),
      })
      .returning();
    return result;
  }

  async findById(id: number) {
    const [result] = await this.db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id));
    return result;
  }

  // Phục vụ filter danh sách cho Patient hoặc Doctor
  async findAll(
    roleId: number,
    roleType: 'Patient' | 'Doctor',
    filter: AppointmentFilterDto,
  ) {
    const { page = 1, limit = 10, status, startDate, endDate } = filter;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (roleType === 'Patient')
      conditions.push(eq(appointments.userId, roleId));
    if (roleType === 'Doctor')
      conditions.push(eq(appointments.doctorId, roleId));
    if (status) conditions.push(eq(appointments.status, status as any));
    if (startDate)
      conditions.push(gte(appointments.appointmentDate, new Date(startDate)));
    if (endDate)
      conditions.push(lte(appointments.appointmentDate, new Date(endDate)));

    const query = this.db.select().from(appointments);
    if (conditions.length > 0) query.where(and(...conditions));

    return query
      .limit(limit)
      .offset(offset)
      .orderBy(desc(appointments.appointmentDate));
  }

  // Logic chống chồng chéo lịch (Anti-overlap check)
  async findOverlapping(userId: number, startTime: Date, endTime: Date) {
    return this.db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.userId, userId),
          or(
            eq(appointments.status, 'Pending'),
            eq(appointments.status, 'Confirmed'),
          ),
          gte(appointments.appointmentDate, startTime),
          lte(appointments.appointmentDate, endTime),
        ),
      );
  }

  async updateStatus(id: number, status: string, reason?: string) {
    const [result] = await this.db
      .update(appointments)
      .set({
        status: status as any,
        reason: reason || null,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, id))
      .returning();
    return result;
  }
}
```

---

## 5. Service Layer (Business Logic)

> **Thư mục:** `src/modules/appointments/appointments.service.ts`
> Áp dụng kỷ luật dữ liệu nghiêm ngặt.

```typescript
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AppointmentsRepository } from './appointments.repository';
// Lưu ý: Cần inject module Connections (E-03) để lấy thông tin kết nối bệnh nhân - bác sĩ.
import { ConnectionsRepository } from '../connections/connections.repository';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { AppointmentFilterDto } from './dto/appointment-filter.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly appointmentsRepo: AppointmentsRepository,
    private readonly connectionsRepo: ConnectionsRepository,
    private readonly eventEmitter: EventEmitter2, // Decoupling Notification Service
  ) {}

  async create(userId: number, dto: CreateAppointmentDto) {
    // Rule 1: Validate kết nối Active trong bảng PatientDoctor (FR-05)
    // Nếu không có liên kết, User không thể đặt lịch với Bác sĩ đó
    const connection = await this.connectionsRepo.findByPatientAndDoctor(
      userId,
      dto.doctorId,
    );
    if (!connection || connection.status !== 'Active') {
      throw new ForbiddenException(
        'Bạn phải kết nối với bác sĩ trước khi đặt lịch hẹn.',
      );
    }

    // Rule 2: Anti-overlap (Khoảng thời gian cách nhau tối thiểu 30 phút cho một User)
    const aptDate = new Date(dto.appointmentDate);
    const timeBufferBefore = new Date(aptDate.getTime() - 30 * 60000);
    const timeBufferAfter = new Date(aptDate.getTime() + 30 * 60000);

    const overlapping = await this.appointmentsRepo.findOverlapping(
      userId,
      timeBufferBefore,
      timeBufferAfter,
    );
    if (overlapping.length > 0) {
      throw new BadRequestException(
        'Bạn đã có lịch hẹn Pending/Confirmed trong khoảng thời gian này.',
      );
    }

    const appointment = await this.appointmentsRepo.create(userId, dto);

    // Rule 3: Bắn Event sang module Notifications (E-06)
    this.eventEmitter.emit('appointment.created', { appointment });

    return appointment;
  }

  async findAll(
    userId: number,
    role: 'Patient' | 'Doctor',
    filter: AppointmentFilterDto,
  ) {
    return this.appointmentsRepo.findAll(userId, role, filter);
  }

  async updateStatus(
    id: number,
    currentUserId: number,
    currentUserRole: 'Patient' | 'Doctor',
    dto: UpdateAppointmentStatusDto,
  ) {
    const appointment = await this.appointmentsRepo.findById(id);
    if (!appointment)
      throw new NotFoundException('Không tìm thấy thông tin lịch hẹn.');

    // State Machine Authorization
    if (currentUserRole === 'Patient') {
      if (appointment.userId !== currentUserId)
        throw new ForbiddenException('Truy cập bị từ chối.');
      // Bệnh nhân chỉ có một quyền duy nhất là hủy lịch (Cancelled)
      if (dto.status !== 'Cancelled') {
        throw new ForbiddenException(
          'Bệnh nhân chỉ có quyền chuyển trạng thái thành Cancelled.',
        );
      }
    } else if (currentUserRole === 'Doctor') {
      if (appointment.doctorId !== currentUserId)
        throw new ForbiddenException('Truy cập bị từ chối.');
      // Bác sĩ có thể Confirm, Complete, hoặc Cancel
    }

    const updated = await this.appointmentsRepo.updateStatus(
      id,
      dto.status,
      dto.reason,
    );

    // Fire Events cho Notification Module
    if (dto.status === 'Confirmed') {
      this.eventEmitter.emit('appointment.confirmed', { appointment: updated });
    } else if (dto.status === 'Cancelled') {
      this.eventEmitter.emit('appointment.cancelled', {
        appointment: updated,
        cancelledBy: currentUserRole,
      });
    }

    return updated;
  }
}
```

---

## 6. Controller Layer

> **Thư mục:** `src/modules/appointments/appointments.controller.ts`

```typescript
import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { AppointmentFilterDto } from './dto/appointment-filter.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Appointments')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles('Patient')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Patient tạo yêu cầu lịch hẹn (Pending)' })
  create(@CurrentUser('id') userId: number, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(userId, dto);
  }

  @Get()
  @Roles('Patient', 'Doctor')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Lấy danh sách lịch hẹn của tôi (Patient/Doctor)' })
  findAll(@CurrentUser() user: any, @Query() filter: AppointmentFilterDto) {
    return this.appointmentsService.findAll(user.id, user.role, filter);
  }

  @Patch(':id/status')
  @Roles('Patient', 'Doctor')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Cập nhật trạng thái lịch hẹn' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.appointmentsService.updateStatus(id, user.id, user.role, dto);
  }
}
```

---

## 7. Module Registration

> **Thư mục:** `src/modules/appointments/appointments.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsRepository } from './appointments.repository';
// ConnectionsModule phải được export ConnectionsRepository ra thì ở đây mới dùng được
import { ConnectionsModule } from '../connections/connections.module';

@Module({
  imports: [ConnectionsModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentsRepository],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
```
````
