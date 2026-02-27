## Raw Concept
**Task:**
Implement AdminModule for user management and doctor verification

**Changes:**
- Created AdminModule with repository and service
- Added UserRole TypeScript enum for unified access in schema.ts
- Implemented verifyDoctor with database transactions

**Files:**
- src/modules/admin/admin.module.ts
- src/modules/admin/admin.service.ts
- src/modules/admin/admin.repository.ts
- src/database/schema.ts

**Flow:**
Admin request -> AdminService -> AdminRepository (transactional) -> Database update

**Timestamp:** 2026-02-26

## Narrative
### Structure
AdminModule follows the standard NestJS module structure. AdminRepository encapsulates Drizzle ORM logic with transactional support for critical operations.

### Dependencies
Integrates with Drizzle ORM and utilizes the centralized UserRole enum defined in the database schema.

### Features
Doctor verification process is atomic, ensuring consistent updates across user and doctor records.

### Rules
Rule 1: Use the TypeScript UserRole enum for consistent role referencing.
Rule 2: Use db.transaction in repository for multi-table updates to maintain data integrity.
