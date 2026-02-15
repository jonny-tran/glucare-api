## Relations
@structure/modules/glucose/glucose_module_phase_1.md
@compliance/localization/glucose_module_localization_vietnamese.md

## Raw Concept
**Task:**
Refactor Glucose & Auth Modules (Services/Interfaces/Localization)

**Changes:**
- Refactored `GlucoseService` to use `GlucoseStorageService` and `GlucoseAnalyticsService`.
- Introduced `IGlucoseReading` interface to decouple database models from business logic.
- Refactored `Auth` module with `JwtPayload` and `JwtPayloadWithRt` interfaces.
- Moved analytic-specific logic to sub-services for better SRP (Single Responsibility Principle).
- Localized service-level strings in Glucose Analytics.

**Files:**
- src/modules/glucose/glucose.service.ts
- src/modules/glucose/services/glucose-storage.service.ts
- src/modules/glucose/services/glucose-analytics.service.ts
- src/modules/glucose/interfaces/glucose.interface.ts
- src/modules/auth/interfaces/auth.interface.ts
- src/modules/auth/decorators/current-user.decorator.ts

**Flow:**
GlucoseService -> (StorageService | AnalyticsService). Auth Logic -> Interface-based payloads.

**Timestamp:** 2026-02-15

## Narrative
### Structure
- `src/modules/glucose/services/`: Contains `GlucoseStorageService` and `GlucoseAnalyticsService`.
- `src/modules/glucose/interfaces/`: Standardized data models.
- `src/modules/auth/interfaces/`: Standardized authentication types.
- `src/modules/auth/decorators/`: Refined `@CurrentUser` with interface support.

### Dependencies
- Dependency: `GlucoseStorageService` replaced direct repository usage in `GlucoseService`.
- Dependency: `IGlucoseReading` interface for type safety between storage and analytics.
- Dependency: `JwtPayload` and `JwtPayloadWithRt` interfaces for auth module.

### Features
- **Decoupled Storage**: Glucose data persistence is now handled by `GlucoseStorageService`.
- **Interface-Driven Design**: Introduced `IGlucoseReading`, `JwtPayload` to standardize data shapes.
- **Enhanced Localization**: Period labels in analytics (e.g., "7 days" -> "7 ngày") are now localized in the service layer.
- **Strong Typing**: Refactored `Auth` module to use explicit interfaces for JWT payloads.
