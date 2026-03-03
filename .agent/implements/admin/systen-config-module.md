# ĐẶC TẢ KỸ THUẬT: MODULE CẤU HÌNH HỆ THỐNG (SYSTEM CONFIGURATION)

**Dự án:** GlucoDia (Gluecare)
**Phiên bản:** 1.0
**Mô tả:** Tài liệu đặc tả kỹ thuật cho việc triển khai module Quản lý Cấu hình Hệ thống, trọng tâm vào việc lưu trữ và phân phối các tiêu chuẩn dữ liệu y tế (Medical Data Standards) cho Analytics Engine. Không bao gồm cấu hình đa ngôn ngữ (loại bỏ khỏi MVP). Thiết kế dựa trên mô hình Key-Value Store kết hợp Caching.

---

## 1. CẤU TRÚC DỮ LIỆU (DATABASE SCHEMA)

Sử dụng Drizzle ORM để định nghĩa bảng lưu trữ cấu hình theo mô hình Key-Value.

### 1.1. Enums

Khai báo Enum cho các Key hệ thống để tránh lỗi hardcode chuỗi (typo) trong quá trình query.

```typescript
export const systemConfigKeyEnum = pgEnum('system_config_key', [
  'GLUCOSE_SAFE_MIN',
  'GLUCOSE_SAFE_MAX',
  // Có thể mở rộng thêm các key khác trong tương lai
]);
```

### 1.2. Bảng `system_configs`

```typescript
export const systemConfigs = pgTable('system_configs', {
  key: systemConfigKeyEnum('key').primaryKey(), // Key đóng vai trò là Primary Key
  value: jsonb('value').notNull(), // Sử dụng jsonb để linh hoạt lưu số (number), chuỗi (string), hoặc object.
  description: text('description'), // Mô tả công dụng của config này
  updatedBy: uuid('updated_by').references(() => users.id), // Audit log: Admin nào cập nhật cuối cùng
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

## 2. DATA TRANSFER OBJECTS (DTOs)

Sử dụng `class-validator` và `swagger` cho validation.

### 2.1. Config DTOs

- `UpdateConfigDto`:
- `value`: `any` (Sử dụng `@IsDefined()` và tuỳ chỉnh validator dựa trên loại config).
- `description`: `string` (Optional).

_Lưu ý: Không có `CreateConfigDto` vì các cấu hình hệ thống cốt lõi sẽ được seed mặc định vào database thông qua file `seed.ts` lúc khởi tạo dự án. Admin chỉ có quyền Update._

---

## 3. ĐẶC TẢ API ENDPOINTS (ROLE: ADMIN)

Yêu cầu Guard: `@UseGuards(AuthGuard, RolesGuard)` và `@Roles('ADMIN')`.
Sử dụng decorator `@CurrentUser()` để lấy `userId` gán vào trường `updatedBy`.

| Method | Endpoint              | Query/Body              | Chức năng chi tiết                                                                                                    |
| ------ | --------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/admin/configs`      | Không có                | Lấy danh sách toàn bộ cấu hình hệ thống hiện tại.                                                                     |
| `GET`  | `/admin/configs/:key` | Params: `key`           | Lấy chi tiết một cấu hình cụ thể theo `key`.                                                                          |
| `PUT`  | `/admin/configs/:key` | Body: `UpdateConfigDto` | Cập nhật giá trị (`value`) của một cấu hình. **Side-effect:** Bắt buộc trigger logic xóa/cập nhật Cache ngay lập tức. |

---

## 4. CƠ CHẾ BỘ NHỚ ĐỆM (CACHING MECHANISM)

Đây là yêu cầu kỹ thuật **BẮT BUỘC** để tối ưu hóa hiệu năng cho `GlucoseAnalyticsService`. Sử dụng `@nestjs/cache-manager`.

### 4.1. Khởi tạo (Bootstrapping)

- Sử dụng lifecycle hook `OnModuleInit` của NestJS trong `SystemConfigService`.
- Khi ứng dụng khởi động, query toàn bộ dữ liệu từ bảng `system_configs` và lưu vào Cache Memory (VD: `cacheManager.set('config_GLUCOSE_SAFE_MIN', 70, 0)` - TTL = 0 nghĩa là cache không bao giờ hết hạn tự nhiên).

### 4.2. Giao tiếp nội bộ (Internal Service API)

- Hàm `SystemConfigService.getConfigValue(key: SystemConfigKey): Promise<any>`
- **Logic:**

1. Lấy giá trị từ Cache.
2. Nếu Cache miss (chưa có), query DB, lưu lại vào Cache rồi trả về.

### 4.3. Cập nhật (Invalidation/Update)

- Khi API `PUT /admin/configs/:key` được gọi thành công:

1. Cập nhật Database.
2. Gọi `cacheManager.set(cacheKey, newValue)` để ghi đè giá trị cache mới nhất.

---

## 5. ĐẶC TẢ UNIT TEST (JEST)

Sử dụng mô hình Mocking cho Repository và CacheManager.

### 5.1. Unit Test: SystemConfigService (`system-config.service.spec.ts`)

- **Initialization:**
- `should load all configs into cache on module init (onModuleInit)`.

- **Get Config (Read):**
- `should return value from cache if exists without querying the database`.
- `should query database, set cache, and return value if cache misses`.
- `should throw error or return default fallback if key does not exist in DB`.

- **Update Config (Write):**
- `should update database successfully with updatedBy info`.
- `should update the corresponding cache key immediately after successful DB update`.

---

## LƯU Ý QUAN TRỌNG DÀNH CHO BƯỚC IMPLEMENTATION (SYSTEM REFACTORING & BRV CONTEXT)

Khi tiến hành implement module này, **BẮT BUỘC** thực hiện các bước sau:

1. **Refactor Hardcode:**

- Quét toàn bộ source code hiện tại, đặc biệt là trong file `src/modules/glucose/services/glucose-analytics.service.ts` và các Service/Controller liên quan.
- Tìm tất cả các giá trị hardcode đang đại diện cho ngưỡng đường huyết (ví dụ: `70` và `180`).
- Xóa bỏ các hardcode này và thay thế bằng lời gọi hàm bất đồng bộ: `await this.systemConfigService.getConfigValue(SystemConfigKey.GLUCOSE_SAFE_MIN)` và `GLUCOSE_SAFE_MAX`.
- Cập nhật lại các Unit Test của `GlucoseAnalyticsService` để mock `SystemConfigService`.

2. **Lưu ngữ cảnh vào BRV (ByteRover):**

- Sau khi implement và refactor xong, cần update các file context markdown trong folder `.brv/context-tree/structure/` (ví dụ: thêm file `system_config_module.md` và update `glucose_module_phase_1.md`).
- Ghi rõ quyết định kiến trúc: _"Đã loại bỏ hardcode ADA Standard 70-180, chuyển sang sử dụng module SystemConfig tích hợp @nestjs/cache-manager để quản lý tập trung và đảm bảo hiệu năng Analytics."_ để AI agent ghi nhớ ngữ cảnh cho các luồng xử lý sau.
