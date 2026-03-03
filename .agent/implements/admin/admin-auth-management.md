# ĐẶC TẢ KỸ THUẬT: MODULE QUẢN LÝ TÀI KHOẢN (ADMIN)

**Dự án:** GlucoDia (Gluecare)
**Phiên bản:** 1.1 (Cập nhật dựa trên Schema hiện tại)
**Trạng thái:** Sẵn sàng Implementation

---

## 1. MỤC TIÊU (OBJECTIVES)

Thực hiện yêu cầu **FR-09** và **US-09**: Cho phép Admin kiểm soát toàn bộ vòng đời tài khoản (Tạo, Khóa, Mở khóa, Xóa) nhằm đảm bảo an ninh hệ thống và tính toàn vẹn của dữ liệu y tế.

---

## 2. CẬU TRÚC DỮ LIỆU (DATABASE SCHEMA UPDATES)

Như tôi đã phân tích, trường `isActive` (boolean) hiện tại quá yếu. Chúng ta cần cập nhật `src/database/schema.ts`.

### 2.1. Định nghĩa Enum mới

```typescript
export const userStatusEnum = pgEnum('user_status', [
  'PENDING',
  'ACTIVE',
  'BLOCKED',
]);
```

- `PENDING`: Bác sĩ mới đăng ký, chờ duyệt `licenseNumber`.
- `ACTIVE`: Hoạt động bình thường.
- `BLOCKED`: Bị khóa do vi phạm hoặc Admin chủ động đình chỉ.

### 2.2. Cập nhật Table `users`

Bổ sung/Thay thế các trường sau:

- `status`: `userStatusEnum` (Default: 'ACTIVE' cho Patient, 'PENDING' cho Doctor).
- `deletedAt`: `timestamp` (Dùng cho **Soft Delete** - BẮT BUỘC).

---

## 3. CHI TIẾT TÍNH NĂNG (FEATURE BREAKDOWN)

### T1: Quản lý Trạng thái (Lock/Unlock)

- **Logic:** Chuyển đổi trạng thái giữa `ACTIVE` và `BLOCKED`.
- **Validation:** Không cho phép Admin tự Block chính mình (Tránh deadlock hệ thống).
- **Side Effect:** Khi User bị `BLOCKED`, mọi Access Token hiện tại phải bị vô hiệu hóa (Admin gọi `hashedRefreshToken = null`).

### T2: Soft Delete (Xóa an toàn)

- **Logic:** Không dùng lệnh `DELETE`. Thay vào đó, cập nhật `deletedAt = now()`.
- **Filter:** Mọi query lấy danh sách User (ngoài Admin) phải luôn filter `where(isNull(users.deletedAt))`.

### T3: Duyệt Bác sĩ (Doctor Verification)

- **Logic:** Admin xem danh sách Bác sĩ có trạng thái `PENDING`. Sau khi kiểm tra `licenseNumber` ngoài đời thực, Admin chuyển trạng thái thành `ACTIVE`.
- **Notification:** Hệ thống tự động tạo một Notification thông báo cho Bác sĩ kết quả duyệt.

### T4: Audit Logging (Bắt buộc cho Admin)

- **Mô tả:** Mọi thay đổi trạng thái User phải được ghi lại.
- **Bảng dữ liệu:** Tạo bảng `audit_logs` (id, adminId, targetUserId, action, reason, timestamp).

---

## 4. CẤU TRÚC LỚP (CLASS DESIGN)

### 4.1. Data Transfer Objects (DTOs)

Sử dụng `class-validator` và `swagger`.

- `AdminUpdateStatusDto`: `{ status: UserStatus, reason: string }`
- `AdminCreateDoctorDto`: (Dựa trên `RegisterDto` nhưng thêm các trường verify).

### 4.2. AdminRepository

Triển khai các phương thức query bằng Drizzle:

- `findAllUsers(filters: UserFilterDto)`: Kết hợp pagination và filter theo role/status.
- `softDeleteUser(userId: string)`: Update `deletedAt`.
- `updateAccountStatus(userId: string, status: UserStatus)`.

### 4.3. AdminService

Chứa Business Logic:

- `handleBlockUser()`: Thực hiện update status + xóa refresh token.
- `verifyDoctor()`: Chuyển status PENDING -> ACTIVE.

---

## 5. QUY TẮC BẢO MẬT (SECURITY RULES)

1. **Authentication:** Mọi API phải qua `AuthGuard` (JWT).
2. **Authorization:** Phải qua `RolesGuard` với `@Roles('ADMIN')`.
3. **Data Privacy:** Admin có thể xem profile nhưng **KHÔNG** được xem mật khẩu đã hash của người dùng.

---

## 6. DANH SÁCH ENDPOINTS (SWAGGER API)

| Method   | Endpoint                    | Description                                                                    |
| -------- | --------------------------- | ------------------------------------------------------------------------------ |
| `GET`    | `/admin/users`              | Lấy danh sách toàn bộ User (có phân trang, filter theo role/status - tìm kiếm) |
| `PATCH`  | `/admin/users/:id/status`   | Cập nhật status (Block/Active)                                                 |
| `DELETE` | `/admin/users/:id`          | Thực hiện Soft Delete                                                          |
| `POST`   | `/admin/doctors/verify/:id` | Duyệt bác sĩ mới                                                               |
| `GET`    | `/admin/stats`              | Thống kê số lượng User/Doctor cho Dashboard                                    |

---

## 7. KẾ HOẠCH TRIỂN KHAI (IMPLEMENTATION STEPS)

1. **Step 1:** Cập nhật `schema.ts`, tạo migration và chạy `pnpm db:push`.
2. **Step 2:** Viết API `GET /admin/users` đầu tiên để đảm bảo Repository query đúng data.
3. **Step 3:** Triển khai API `PATCH status` và viết logic xóa Token.
4. **Step 4:** Triển khai Soft Delete.
5. **Step 5:** Gắn Swagger decorators và viết Unit Test cho `AdminService`.

---

**Lời nhắn từ Lead:**
Đây là bản đồ. Đừng đi chệch hướng. Tạo ra code chuẩn NestJS + Drizzle
