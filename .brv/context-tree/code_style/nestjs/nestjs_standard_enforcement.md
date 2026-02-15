## Raw Concept
**Task:**
Standardize NestJS Controllers and DTOs for consistent responses and Swagger documentation.

**Changes:**
- Enforce @ResponseMessage on all controller methods returning success responses.
- Enforce @ApiProperty on all DTO fields.

**Files:**
- src/modules/**/*.controller.ts
- src/modules/**/*.dto.ts

**Flow:**
Implementation order: DTO -> Repository -> Service -> Controller

**Timestamp:** 2026-02-15

## Narrative
### Structure
- DTOs: src/modules/*/dto/*.dto.ts
- Controllers: src/modules/*/*.controller.ts

### Dependencies
- @nestjs/swagger for @ApiProperty
- src/common/decorators/response-message.decorator.ts for @ResponseMessage

### Features
- Controllers MUST use @ResponseMessage for consistent API success responses.
- DTOs MUST include @ApiProperty on all fields for Swagger documentation sync.
