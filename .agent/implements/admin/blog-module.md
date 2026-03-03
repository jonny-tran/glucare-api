# ĐẶC TẢ KỸ THUẬT: MODULE KHO KIẾN THỨC Y KHOA (KNOWLEDGE BASE) & QUẢN LÝ DANH MỤC

**Dự án:** GlucoDia (Gluecare)
**Phiên bản:** 1.0
**Mô tả:** Tài liệu đặc tả kỹ thuật cho việc triển khai (implement) hệ thống quản lý danh mục (Category) và bài viết y khoa (Knowledge Article), phục vụ luồng nghiệp vụ của Admin (Quản trị) và Patient (Tiêu thụ).

---

## 1. CẤU TRÚC DỮ LIỆU (DATABASE SCHEMA)

Sử dụng Drizzle ORM để định nghĩa các bảng dữ liệu.

### 1.1. Enums

```typescript
export const articleLanguageEnum = pgEnum('article_language', ['VI', 'EN']);
```

### 1.2. Bảng `categories` (Danh mục bài viết)

```typescript
export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'), // Hỗ trợ Soft Delete & Restore
});
```

### 1.3. Bảng `knowledge_articles` (Bài viết y khoa)

```typescript
export const knowledgeArticles = pgTable('knowledge_articles', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  categoryId: uuid('category_id')
    .references(() => categories.id)
    .notNull(),
  thumbnailUrl: text('thumbnail_url'),
  language: articleLanguageEnum('language').notNull(), // Theo NFR-01
  isPublished: boolean('is_published').default(false).notNull(),
  viewCount: integer('view_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'), // Hỗ trợ Soft Delete & Restore
});
```

---

## 2. DATA TRANSFER OBJECTS (DTOs)

### 2.1. Category DTOs

- `CreateCategoryDto`: `{ name: string, description?: string }`
- `UpdateCategoryDto`: Partial của `CreateCategoryDto`.
- `CategoryFilterDto` (kế thừa PaginationQueryDto): `{ search?: string, includeDeleted?: boolean }`

### 2.2. Article DTOs

- `CreateArticleDto`: `{ title: string, content: string, categoryId: string, language: 'VI' | 'EN', thumbnailUrl?: string }`
- `UpdateArticleDto`: Partial của `CreateArticleDto`.
- `AdminArticleFilterDto` (kế thừa PaginationQueryDto): `{ search?: string, categoryId?: string, language?: 'VI' | 'EN', isPublished?: boolean, includeDeleted?: boolean }`
- `PatientArticleFilterDto` (kế thừa PaginationQueryDto): `{ categoryId?: string, language: 'VI' | 'EN' }` (Lưu ý: Bắt buộc truyền `language`, tuyệt đối không cho phép truyền `isPublished`).

---

## 3. ĐẶC TẢ API ENDPOINTS

### 3.1. Quản lý Danh mục (Category Management - Role: ADMIN)

Yêu cầu Guard: `@UseGuards(AuthGuard, RolesGuard)` và `@Roles('ADMIN')`.

| Method   | Endpoint                        | Query/Body                 | Chức năng chi tiết                                                                                    |
| -------- | ------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `GET`    | `/admin/categories`             | Query: `CategoryFilterDto` | Lấy danh sách phân trang. Có filter, search theo tên. Trả về cả mục đã xóa nếu `includeDeleted=true`. |
| `GET`    | `/admin/categories/:id`         | Params: `id`               | Lấy chi tiết một Category.                                                                            |
| `POST`   | `/admin/categories`             | Body: `CreateCategoryDto`  | Tạo danh mục mới. Báo lỗi 409 nếu trùng tên.                                                          |
| `PUT`    | `/admin/categories/:id`         | Body: `UpdateCategoryDto`  | Cập nhật thông tin danh mục.                                                                          |
| `DELETE` | `/admin/categories/:id`         | Params: `id`               | Soft Delete danh mục (Cập nhật `deletedAt = now()`).                                                  |
| `POST`   | `/admin/categories/:id/restore` | Params: `id`               | Restore danh mục (Cập nhật `deletedAt = null`).                                                       |

### 3.2. Quản lý Bài viết (Article Management - Role: ADMIN)

Yêu cầu Guard: `@UseGuards(AuthGuard, RolesGuard)` và `@Roles('ADMIN')`.

| Method   | Endpoint                           | Query/Body                       | Chức năng chi tiết                                                                                                                 |
| -------- | ---------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/admin/articles`                  | Query: `AdminArticleFilterDto`   | Lấy danh sách toàn bộ bài viết (kể cả Draft). Hỗ trợ search theo tiêu đề, filter theo category, language, isPublished. Phân trang. |
| `GET`    | `/admin/articles/:id`              | Params: `id`                     | Lấy chi tiết bài viết để edit.                                                                                                     |
| `POST`   | `/admin/articles`                  | Body: `CreateArticleDto`         | Tạo bài viết mới. Trạng thái mặc định `isPublished = false` (Draft).                                                               |
| `PUT`    | `/admin/articles/:id`              | Body: `UpdateArticleDto`         | Cập nhật nội dung bài viết.                                                                                                        |
| `PATCH`  | `/admin/articles/:id/publish`      | Body: `{ isPublished: boolean }` | Chuyển đổi trạng thái Duyệt/Gỡ bài (Publish/Unpublish).                                                                            |
| `DELETE` | `/admin/articles/:id`              | Params: `id`                     | Soft delete bài viết.                                                                                                              |
| `POST`   | `/admin/articles/:id/restore`      | Params: `id`                     | Restore bài viết.                                                                                                                  |
| `POST`   | `/admin/articles/upload-thumbnail` | `multipart/form-data`            | Upload ảnh bìa lên Firebase Storage. Trả về `thumbnailUrl`.                                                                        |

### 3.3. Tiêu thụ nội dung (Content Consumption - Role: PATIENT)

Yêu cầu Guard: `@UseGuards(AuthGuard, RolesGuard)` và `@Roles('PATIENT')`.

| Method | Endpoint                | Query/Body                       | Chức năng chi tiết                                                                                                                                                                     |
| ------ | ----------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/patient/articles`     | Query: `PatientArticleFilterDto` | Lấy danh sách bài viết. **BẮT BUỘC** hardcode `where: isPublished = true` và `deletedAt is null` ở Repository. Bắt buộc filter theo `language`. Mặc định sắp xếp `createdAt` giảm dần. |
| `GET`  | `/patient/articles/:id` | Params: `id`                     | Xem chi tiết bài. Nếu bài `isPublished = false`, trả về lỗi 404. **Side-effect:** Gọi hàm tăng `viewCount += 1`.                                                                       |

---

## 4. RÀNG BUỘC KỸ THUẬT (TECHNICAL CONSTRAINTS)

1. **Toàn vẹn khóa ngoại:** Không cho phép Hard Delete Category nếu vẫn còn Article tham chiếu tới (hoặc phải xử lý logic Soft Delete cascade nếu nghiệp vụ yêu cầu).
2. **Data Leakage Prevention:** Dữ liệu trả về cho API của Patient tuyệt đối không bao gồm bài viết Draft hoặc bài viết đã bị Soft Delete.
3. **Fallback Image:** Nếu bài viết không có `thumbnailUrl`, lớp DTO Response phải tự động map một chuỗi URL ảnh mặc định của hệ thống trước khi trả về client.
4. **Transaction Handling:** Logic cập nhật `viewCount` phải diễn ra bất đồng bộ (hoặc non-blocking) để không làm giảm thời gian phản hồi (Response Time) của API xem chi tiết.

---

## 5. ĐẶC TẢ UNIT TEST (JEST & TESTING MODULE)

Hệ thống yêu cầu viết Unit Test đầy đủ cho Controllers và Services sử dụng mô hình Mocking (Mock Repository).

### 5.1. Unit Test: Category Service (`category.service.spec.ts`)

- **Create Category:**
- `should create a category successfully`.
- `should throw ConflictException if category name already exists`.

- **Get Categories:**
- `should return paginated list of categories without deleted items by default`.
- `should return paginated list of categories including deleted items if includeDeleted is true`.

- **Soft Delete & Restore:**
- `should soft delete category by setting deletedAt`.
- `should throw NotFoundException when deleting a non-existent category`.
- `should restore a soft-deleted category by setting deletedAt to null`.

### 5.2. Unit Test: Article Admin Service (`article-admin.service.spec.ts`)

- **Create Article:**
- `should create a new article with isPublished defaulting to false`.
- `should throw NotFoundException if provided categoryId does not exist`.

- **Publish Article:**
- `should update isPublished status to true`.

- **Soft Delete & Restore:**
- `should soft delete article by setting deletedAt`.
- `should restore a soft-deleted article`.

### 5.3. Unit Test: Article Patient Service (`article-patient.service.spec.ts`)

- **Get List (Consumption):**
- `should return only published articles (isPublished = true) and null deletedAt`.
- `should filter articles by strictly matching language parameter (VI or EN)`.
- `should map default placeholder image if thumbnailUrl is null`.

- **Read Detail & View Count:**
- `should return article details and trigger incrementViewCount`.
- `should throw NotFoundException if article is not published (isPublished = false)`.
- `should throw NotFoundException if article is soft-deleted`.
- `should verify viewCount is incremented by exactly 1 upon successful read`.
