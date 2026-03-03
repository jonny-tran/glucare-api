# ĐẶC TẢ KỸ THUẬT: MODULE BÁO CÁO TỔNG QUAN (ADMIN DASHBOARD)

**Dự án:** GlucoDia (Gluecare)
**Phiên bản:** 1.0
**Mô tả:** Tài liệu đặc tả kỹ thuật cho việc triển khai module Admin Dashboard. Hệ thống cung cấp các chỉ số đo lường hiệu quả hoạt động (Business Health) và theo dõi chi phí AI (AI Cost Tracking). Áp dụng chiến lược Caching và Background Jobs để đảm bảo hiệu năng, không gây nghẽn Database.

---

## 1. CẬP NHẬT CẤU TRÚC DỮ LIỆU (DATABASE SCHEMA)

Bổ sung bảng lưu vết lịch sử sử dụng AI vào file `schema.ts`.

### 1.1. Khai báo Enums

```typescript
export const aiFeatureEnum = pgEnum('ai_feature', ['VOICE', 'OCR']);
export const aiRequestStatusEnum = pgEnum('ai_request_status', [
  'SUCCESS',
  'FAILED',
]);
```

### 1.2. Bảng `ai_usage_logs`

```typescript
export const aiUsageLogs = pgTable('ai_usage_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(), // Người gọi API
  feature: aiFeatureEnum('feature').notNull(), // Tính năng được sử dụng (Voice/OCR)
  status: aiRequestStatusEnum('status').notNull(), // Trạng thái xử lý của Gemini
  errorMessage: text('error_message'), // Lưu lý do lỗi nếu FAILED
  durationMs: integer('duration_ms'), // (Tùy chọn) Thời gian phản hồi của AI để theo dõi latency
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Định nghĩa quan hệ (Relations)
export const aiUsageLogsRelations = relations(aiUsageLogs, ({ one }) => ({
  user: one(users, {
    fields: [aiUsageLogs.userId],
    references: [users.id],
  }),
}));
```

---

## 2. DATA TRANSFER OBJECTS (DTOs)

Định nghĩa cấu trúc dữ liệu trả về cho Client (Response DTOs). Sử dụng `@ApiProperty()` của Swagger để document.

### 2.1. `DashboardOverviewResponseDto`

```typescript
export class PatientMetricsDto {
  totalPatients: number;
  newPatientsThisMonth: number;
  growthPercentage: number; // % Tăng trưởng so với tháng trước
  activePatients7Days: number;
}

export class DoctorMetricsDto {
  totalDoctors: number;
  pendingDoctors: number;
  activeDoctors: number;
  blockedDoctors: number;
  activeConnections: number; // Số luồng kết nối Patient-Doctor đang ACTIVE
}

export class AiCostMetricsDto {
  totalRequestsThisMonth: number;
  voiceUsagePercentage: number;
  ocrUsagePercentage: number;
  successRatePercentage: number;
  failedRequests: number;
}

export class SystemHealthMetricsDto {
  dataIngestionToday: number; // Số bản ghi đường huyết log hôm nay
  publishedArticles: number;
  draftArticles: number;
}

export class DashboardOverviewResponseDto {
  patients: PatientMetricsDto;
  doctors: DoctorMetricsDto;
  aiTracking: AiCostMetricsDto;
  systemHealth: SystemHealthMetricsDto;
  lastUpdatedAt: Date; // Thời gian Cache được cập nhật lần cuối
}
```

---

## 3. KIẾN TRÚC HIỆU NĂNG (CACHING & CRONJOB)

Tuyệt đối không thực hiện Query trực tiếp (Real-time calculation) cho các chỉ số tổng hợp khi API Dashboard được gọi.

### 3.1. Cronjob Task (`DashboardCronService`)

- **Thư viện:** `@nestjs/schedule`.
- **Thời gian chạy:** Chạy định kỳ mỗi 1 giờ (`@Cron(CronExpression.EVERY_HOUR)`).
- **Nhiệm vụ:**

1. Thực hiện các câu query đếm (`COUNT`), gom nhóm (`GROUP BY`), tính toán phần trăm tăng trưởng.
2. Tổng hợp dữ liệu thành object khớp với cấu trúc `DashboardOverviewResponseDto`.
3. Lưu object kết quả vào Cache với Key: `ADMIN_DASHBOARD_OVERVIEW_DATA`. (Set TTL = 0 để cache không tự động mất).

### 3.2. Truy xuất dữ liệu (`DashboardService`)

- **Thư viện:** `@nestjs/cache-manager`.
- **Nhiệm vụ:** Lấy dữ liệu từ Key `ADMIN_DASHBOARD_OVERVIEW_DATA` và trả về ngay lập tức (Thời gian phản hồi mục tiêu: `< 20ms`).
- **Fallback:** Nếu Cache rỗng (Hệ thống vừa khởi động lại chưa tới chu kỳ Cron), kích hoạt tính toán động 1 lần, lưu Cache rồi trả về.

---

## 4. ĐẶC TẢ API ENDPOINTS (ROLE: ADMIN)

Yêu cầu Guard: `@UseGuards(AuthGuard, RolesGuard)` và `@Roles('ADMIN')`.

| Method | Endpoint                    | Query/Body | Chức năng chi tiết                                                                                                                                                          |
| ------ | --------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/admin/dashboard/overview` | Không có   | Lấy dữ liệu thống kê tổng quan (Đọc từ Cache). Trả về `DashboardOverviewResponseDto`.                                                                                       |
| `POST` | `/admin/dashboard/refresh`  | Không có   | Kích hoạt tính toán lại dữ liệu ngay lập tức (Force Refresh) và đè lên Cache hiện tại. Phục vụ trường hợp Admin muốn xem số liệu thực tế ngay lập tức mà không chờ Cronjob. |

---

## 5. ĐẶC TẢ UNIT TEST (JEST & TESTING MODULE)

Hệ thống yêu cầu Unit Test nghiêm ngặt cho logic Caching và Cronjob. Sử dụng Mocking cho `Repository`, `CacheManager` và `SchedulerRegistry`.

### 5.1. Unit Test: DashboardCronService (`dashboard-cron.service.spec.ts`)

- **Job Execution:**
- `should execute data aggregation and store results in cache on cron tick`.

- **Metric Calculations (Logic Testing):**
- `should correctly calculate growthPercentage for new patients avoiding division by zero`.
- `should correctly calculate voiceUsagePercentage and ocrUsagePercentage mapping from aiUsageLogs group by`.
- `should map pending, active, and blocked doctors correctly from database counters`.

### 5.2. Unit Test: DashboardService (`dashboard.service.spec.ts`)

- **Get Overview:**
- `should return cached dashboard overview immediately if cache hits`.
- `should trigger manual aggregation, set cache, and return data if cache misses`.

- **Force Refresh:**
- `should execute aggregation, overwrite existing cache, and return updated data on force refresh`.

### 5.3. Unit Test: DashboardController (`dashboard.controller.spec.ts`)

- **Authorization:**
- `should be protected by AuthGuard and RolesGuard(ADMIN)`.

---

## LƯU Ý KHI IMPLEMENT (SYSTEM CHECK & BRV CONTEXT)

1. **Cập nhật Logging AI:** Mở các Service xử lý AI hiện tại (nếu đã có trong Giai đoạn 1/2) và bổ sung đoạn code `INSERT INTO ai_usage_logs` vào khối `try-catch` khi gọi API của Google Gemini để bắt đầu thu thập dữ liệu chi phí.
2. **Lưu ngữ cảnh vào BRV (ByteRover):**

- Tạo file markdown tại `.brv/context-tree/structure/modules/admin/dashboard_overview.md`.
- Ghi chú rõ quyết định thiết kế: _"Implement Admin Dashboard theo chiến lược Cronjob 1h/lần kết hợp In-memory Cache để tránh Database Bottleneck. Bổ sung bảng `ai_usage_logs` để audit AI Request Cost."_
