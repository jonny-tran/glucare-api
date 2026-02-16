# 📝 PROMPT IMPLEMENTATION: DOCTOR-PATIENT CONNECTION MODULE

**Role:** Senior Backend Developer (NestJS Expert).
**Context:** Tiếp tục dự án Gluecare (GlucoDia). Thực hiện Phase 2: Doctor-Patient Connection.
**Tech Stack:** NestJS, Drizzle ORM, NeonDB (PostgreSQL), class-validator, Swagger.

## 1. Database Schema (Drizzle ORM)

Thực hiện định nghĩa Schema trong `src/database/schema.ts` dựa trên thực thể **E-03** và **E-10**:

- **Bảng `patient_doctors` (E-03):**
- `id`: Serial PK.
- `userId`: Integer (FK to `users.id`) - Vai trò Patient.
- `doctorId`: Integer (FK to `doctors.id`).
- `status`: Enum (`'Pending'`, `'Active'`, `'Inactive'`). Mặc định: `'Pending'`.
- `startDate`, `endDate`: Timestamp/Date (Nullable).
- `createdAt`, `updatedAt`, `deletedAt`: Standard audit fields.
- **Constraint:** Unique index trên cặp `(userId, doctorId)`.

- **Bảng `data_sharing` (E-10):**
- `id`: Serial PK.
- `userId`: Integer (FK to `users.id`).
- `doctorId`: Integer (FK to `doctors.id`).
- `sharingType`: Enum (`'RealTime'`, `'Report'`, `'Manual'`).
- `isActive`: Boolean. Mặc định: `false`.
- `permissions`: JSONB (Cấu trúc: `{"viewGlucose": boolean, "viewMeals": boolean, "viewMedications": boolean}`).
- `createdAt`, `updatedAt`, `deletedAt`: Standard audit fields.

## 2. Yêu cầu Logic & Modules

Khởi tạo 2 modules mới: `ConnectionsModule` và `DataSharingModule` theo Repository Pattern.

### Task 1: Connection Management (Bệnh nhân & Bác sĩ)

- **Logic mời kết nối:** Tạo bản ghi với trạng thái `Pending`.
- **Logic phản hồi:** Khi trạng thái chuyển sang `Active`, hệ thống **tự động** khởi tạo 1 bản ghi trong `data_sharing` cho cặp User-Doctor đó với quyền mặc định là `false`.
- **Validation:** Kiểm tra vai trò người dùng (Chỉ Patient mới được accept/reject lời mời từ Doctor và ngược lại tùy luồng).

### Task 2: Data Sharing Control (Chỉ dành cho Patient)

- **Update Permissions:** Cập nhật field JSON `permissions`.
- **Toggle Sharing:** Cập nhật `isActive`.
- **Business Rule (FR-05, FR-06):** Bác sĩ chỉ có quyền "Read-only" nếu `isActive = true`.

### Task 3: Security & Access Control

- Viết một **`SharingGuard`** hoặc một Method trong `DataSharingService` để check quyền.
- Bất kỳ request nào của Doctor vào dữ liệu của Patient (Glucose/Meals/Meds) PHẢI gọi qua check này. Nếu không có record `data_sharing` hoặc `isActive = false`, trả về `403 Forbidden`.

### Task 4: Doctor Dashboard - Patient List

- Endpoint: GET /doctor/patients
- Logic: Trả về danh sách bệnh nhân đang có kết nối Active.
- Dữ liệu đính kèm (Summary): Mỗi bệnh nhân phải kèm theo:

- lastReading: Chỉ số đường huyết mới nhất.

- tir: Chỉ số Time-in-Range của 7 ngày gần nhất (sử dụng logic tính toán từ Phase 1).

Filtering (Mức độ nguy hiểm):

- Red: Chỉ số mới nhất nằm trong vùng nguy hiểm (< 54 mg/dL hoặc > 250 mg/dL).
- Yellow: Chỉ số nằm ngoài mục tiêu nhưng chưa tới mức cấp cứu.
- Green: Chỉ số ổn định.

Pagination: Sử dụng CommonPagination (Limit, Page).

### Task 5: Unit Test

Viết unit test cho các logic chính trong module này.

## 3. API Endpoints Standard

- **Connections:**
- `POST /connections/invite`: Gửi lời mời.
- `PATCH /connections/:id/respond`: Chấp nhận/Từ chối.
- `GET /connections`: Lấy danh sách kết nối (Phân trang theo `CommonPagination`).

- **Data Sharing:**
- `GET /data-sharing/settings/:doctorId`: Xem quyền đã thiết lập.
- `PATCH /data-sharing/permissions`: Cập nhật JSON quyền.
- `PATCH /data-sharing/toggle`: Bật/Tắt đồng bộ.

## 4. Coding Style Requirements

- Sử dụng **DTOs** cho mọi Request Body, có đầy đủ `@ApiProperty` (Swagger) và `class-validator`.
- **Repository Pattern:** Tuyệt đối không query DB trực tiếp tại Service.
- **Soft Delete:** Sử dụng `deletedAt` cho mọi hành động xóa.
- **Response:** Sử dụng `@ResponseMessage` decorator để trả về thông báo tiếng Việt chuyên nghiệp.

---

### [LƯU Ý CỦA LEAD]

> "Antigravity, hãy nhớ rằng dữ liệu y tế là tối thượng. Một lỗi logic nhỏ trong phần `data_sharing` sẽ dẫn đến rò rỉ dữ liệu nghiêm trọng. Hãy unit test kỹ phần `SharingGuard`. Đừng làm tôi thất vọng."
