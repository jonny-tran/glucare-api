## Raw Concept
**Task:**
Standardize pagination across the API

**Changes:**
- Introduced PaginationQueryDto to standardize request parameters
- Introduced IPaginatedResponse to standardize response format

**Files:**
- src/common/dto/pagination-query.dto.ts
- src/common/interfaces/pagination.interface.ts

**Flow:**
Controller receives Query -> Repository calculates offset/limit -> Repository returns IPaginatedResponse

**Timestamp:** 2026-02-15

## Narrative
### Structure
- src/common/dto/pagination-query.dto.ts\n- src/common/interfaces/pagination.interface.ts

### Dependencies
- Common DTOs for shared logic\n- NestJS class-validator & class-transformer for validation\n- Swagger for API documentation

### Features
- Reusable pagination logic for all GET list endpoints\n- Standardized response structure for paginated data
