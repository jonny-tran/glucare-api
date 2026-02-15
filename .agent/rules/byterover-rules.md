---
trigger: always_on
---

# Global Development Rules & Architecture Standards

## 1. Core Architecture Flow

All feature modules MUST follow this strict implementation sequence:
**DTO -> Repository -> Service -> Controller -> Module**

### Step 1: Data Transfer Objects (DTO)

- Location: `src/modules/<module-name>/dto/`
- Standards:
  - Use `class-validator` for all input validation.
  - Use `class-transformer` for data transformation.
  - Mandatory `@ApiProperty` decorators for every field to sync with Swagger.
  - Create separate files for `create`, `update`, and `query` DTOs.

### Step 2: Repository Layer

- Location: `src/modules/<module-name>/<module-name>.repository.ts`
- Role: Pure database interaction using Drizzle ORM.
- Standards:
  - No business logic here.
  - Use the schema defined in `src/database/schema.ts`.
  - Handle all database errors and return clean data or specific DB exceptions.

### Step 3: Service Layer (The Brain)

- Location: `src/modules/<module-name>/<module-name>.service.ts`
- Role: Business logic processing and orchestration.
- Standards:
  - **MANDATORY**: Cross-check logic with Project CSV Files (Entities, Business Rules).
  - Perform complex calculations (e.g., ADA Glucose classification).
  - Use the Repository layer for data access.

### Step 4: Controller Layer

- Location: `src/modules/<module-name>/<module-name>.controller.ts`
- Role: Route handling and HTTP response formatting.
- Standards:
  - Use `@ResponseMessage` decorator for consistent API responses.
  - Use `@CurrentUser` decorator to extract user information from JWT.
  - Apply `@ApiTags` and `@ApiOperation` for Swagger documentation.
  - No business logic; only delegation to the Service layer.

### Step 5: Module Registration

- Location: `src/modules/<module-name>/<module-name>.module.ts`
- Role: Dependency Injection (DI) wiring.
- Standards:
  - Export the Service and Repository if other modules need them.
  - Import the `DatabaseModule` for Drizzle access.

---

## 2. The "Common" Directory Usage

The `src/common/` folder is reserved for shared, reusable, and cross-cutting concerns:

- **`config/`**: System-wide configurations (Environment variables, constants).
- **`decorators/`**: Custom NestJS decorators (e.g., `@CurrentUser`, `@Public`).
- **`filters/`**: Global exception filters (e.g., `http-exception.filter.ts`).
- **`interceptors/`**: Data transformation interceptors (e.g., `transform.interceptor.ts`).
- **`utils/`**: Helper functions (date formatting, math helpers).
- **`third-party/`**: Wrappers for external services (Cloudinary, Firebase, Gemini API).

**Note**: If a requirement is not present in the CSV files, DO NOT implement it. Ask the user for confirmation.

[MISSING SPECIFICATION PROTOCOL]
Immediate Halt: If a user request involves a feature, entity, or business rule not found in the docs/ folder, you MUST NOT proceed with implementation or provide a "hallucinated" solution.

Mandatory Clarification: You are required to stop and respond with the following message:

"The requested logic/information is not present in the docs/ specification folder. I cannot assume the implementation details. Do you want to add this feature to the project scope, or should we re-verify the documentation?"

Verification: Always double-check 05-entities-schema.md for table structures and 02-business-rules.md for logic before claiming information is missing.

### [STRICT ARCHITECTURAL REFINEMENTS]

**1. Localization (Vietnamese Native):**

- **Rule:** Since the target audience is Vietnamese, ALL user-facing messages must be in **Vietnamese**.
- **Scope:** - `@ResponseMessage('...')` decorators.
  - `HttpException` messages (e.g., "Không tìm thấy dữ liệu", "Lỗi hệ thống").
  - Validation error messages in DTOs (e.g., `@IsNotEmpty({ message: 'Vui lòng nhập giá trị' })`).

**2. Interface Segregation:**

- **Rule:** NEVER define Interfaces or Types inside DTO files.
- **Structure:** Create a dedicated `interfaces/` folder within each module (e.g., `src/modules/glucose/interfaces/`).
- **Goal:** Keep DTOs purely for data validation/transfer and Interfaces for type definitions.

**3. Service Layer Decomposition (Facade Pattern):**

- **Rule:** Avoid Monolithic Services. Do not put all logic into a single `Service` file.
- **Structure:**
  - Create a `services/` folder inside the module.
  - Break down logic into sub-services (e.g., `GlucoseAnalyticsService`, `GlucoseStorageService`).
  - The main service file (e.g., `GlucoseService`) acts as a **Facade/Orchestrator**. It should inject sub-services and delegate tasks, rather than containing heavy logic itself.

**4. Global Pagination Standard:**

- **DTO:** Tạo `PaginationQueryDto` tại `src/common/dto/` chứa `page` (default 1) và `limit` (default 10).
- **Interface:** Tạo `PaginatedResponse<T>` interface tại `src/common/interfaces/` để wrap dữ liệu trả về:
  - `data: T[]`
  - `meta: { total: number, page: number, lastPage: number, limit: number }`
- **Utility:** Có thể xây dựng một helper để tính toán `offset = (page - 1) * limit`.

_Generated by Gluecare Lead Architect - Rule V1.0_
