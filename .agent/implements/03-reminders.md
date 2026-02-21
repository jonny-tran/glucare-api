# 📝 PROMPT IMPLEMENTATION: REMINDER SYSTEM & NOTIFICATIONS (PHASE 3 - CORE ENGINE)

**Role:** Senior Backend Developer (System Architect Level).
**Context:** Triển khai **Task 2 (Scheduler)** và **Task 3 (Delivery)** của Phase 3. Đây là phần logic phức tạp nhất liên quan đến lập lịch (Cron), xử lý bất đồng bộ (Queues) và múi giờ (Timezone).
**Tech Stack:** NestJS, Drizzle ORM, BullMQ (Redis), Firebase Admin SDK.

---

## 1. Database Schema (Drizzle ORM)

Cập nhật `src/database/schema.ts` với 2 bảng mới.

### A. Bảng `reminders` (E-08)

- `id`: Serial PK.
- `userId`: Integer (FK `users.id`).
- `medicationId`: Integer (Nullable, FK `medications.id`).
- `title`: Varchar (Required).
- `type`: Enum (`'Medication'`, `'Measurement'`).
- `time`: Varchar (Format "HH:mm" - Giờ địa phương của User).
- `daysOfWeek`: Integer Array (Postgres `integer[]`). Quy ước: 0=Sun, 1=Mon... 6=Sat.
- `isActive`: Boolean (Default `true`).
- `createdAt`, `updatedAt`, `deletedAt`: Timestamp (Soft Delete).

### B. Bảng `notification_tokens` (Quản lý Device Token)

- `id`: Serial PK.
- `userId`: Integer (FK `users.id`).
- `fcmToken`: Varchar (Unique).
- `deviceType`: Varchar (Optional: 'iOS', 'Android').
- `updatedAt`: Timestamp (Để track token active cuối cùng).

---

## 2. Module Implementations

### 📦 Module 1: Notifications (Delivery System)

**Nhiệm vụ:** Quản lý FCM Token và gửi Push Notification.

1. **Endpoint:** `POST /notifications/device-token`

- **DTO:** `{ fcmToken: string, deviceType?: string }`.
- **Logic:** Upsert token vào bảng `notification_tokens`. Nếu token đã tồn tại cho user khác -> Update lại owner (xử lý case mượn máy).

2. **Service (`NotificationsService`):**

- Method `sendPushNotification(userId: number, title: string, body: string)`:
- Query lấy danh sách tokens của User.
- Sử dụng `firebase-admin` để gửi multicast message.
- Xử lý lỗi: Nếu Firebase báo token hết hạn/invalid -> Xóa token đó khỏi DB ngay lập tức (Clean up).

### 🕰️ Module 2: Reminders (The Scheduler Engine)

**Nhiệm vụ:** CRUD Reminder và quản lý BullMQ Jobs.

1. **Endpoint:** `POST /reminders`

- **DTO:**
- `title`: string.
- `type`: Enum.
- `medicationId`: number (Optional).
- `time`: string (Format "HH:mm", VD: "08:00").
- `daysOfWeek`: number[].
- `timezone`: string (Optional, Default: "Asia/Ho_Chi_Minh"). **(QUAN TRỌNG)**.

- **Logic:**
- Lưu record vào NeonDB.
- Gọi `ReminderQueueService.scheduleReminder(reminder, timezone)`.

2. **Endpoint:** `PATCH /reminders/:id/toggle`

- **Logic:**
- Đảo ngược trạng thái `isActive`.
- Nếu `False`: `queue.removeRepeatable(...)`.
- Nếu `True`: `queue.add(...)` lại job với config cũ.

3. **Endpoint:** `DELETE /reminders/:id`

- **Logic:** Soft Delete trong DB + Remove Job vĩnh viễn khỏi Redis.

---

## 3. 🧠 CRITICAL LOGIC: Timezone & BullMQ

### A. Logic chuyển đổi giờ (The "Killer" Logic)

Hệ thống Server/Redis chạy giờ UTC. User sống ở GMT+7.

- **Input:** User chọn `08:00` sáng, timezone `Asia/Ho_Chi_Minh`.
- **Conversion:** Cần convert `08:00` tại `Asia/Ho_Chi_Minh` sang giờ UTC.
- Ví dụ: 08:00 GMT+7 = 01:00 UTC.

- **Cron Generation:**
- Pattern BullMQ yêu cầu: `minute hour dayOfMonth month dayOfWeek`.
- Với input trên, Cron string phải là: `0 1 * * 1,3,5` (Nếu chọn thứ 2,4,6).
- _Lưu ý:_ Cần thư viện `date-fns-tz` để lấy offset chính xác theo timezone gửi lên. Không được hardcode +7.

### B. Cấu trúc BullMQ Processor (`ReminderProcessor`)

- Decorator: `@Processor('reminders')`.
- **Process Logic:**

1. Nhận job data: `{ userId, reminderId, title }`.
2. Check chéo lại DB (Double check): Query bảng `reminders` xem `isActive` có còn `true` không và `deletedAt` có `null` không? (Đề phòng race condition khi job đã vào queue nhưng user vừa xóa tức thì).
3. Nếu Active: Gọi `NotificationsService.sendPushNotification`.

---

## 4. Yêu cầu Kỹ thuật & Quality Control

- **Job ID Consistency:** Khi add job vào BullMQ, bắt buộc set `jobId` theo format: `reminder:{db_id}`. Điều này giúp việc tìm và xóa job (Remove) chính xác 100% không bị nhầm job.
- **Validation:**
- `time`: Validate Regex `^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$`.
- `daysOfWeek`: Validate array chỉ chứa số 0-6.

- **Libraries:** Cài đặt thêm `date-fns-tz` (để xử lý múi giờ) và `firebase-admin`.

---

### [MỆNH LỆNH THỰC THI]

1. Định nghĩa Schema Drizzle trước.
2. Implement `NotificationsModule` (cơ chế gửi).
3. Implement `RemindersModule` (cơ chế lập lịch).
4. Viết Unit Test cho hàm `convertLocalTimeToUtcCron` (Logic này sai là toàn bộ hệ thống vứt đi).
