# Data Entities & Database Schema Specification

This document serves as the **Data Dictionary** for GlucoDia. All Drizzle ORM models must strictly implement these fields and relationships.

## 1. Core User & Profiles

| Entity ID | Name               | Attributes & Types                                                                                                                                                                       | Primary Key     | Foreign Keys     | Relationships                                    |
| --------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ---------------- | ------------------------------------------------ |
| **E-01**  | **User (Patient)** | UserID: INT, Email: VARCHAR(50), Password: VARCHAR(255), FullName: VARCHAR(100), Phone: VARCHAR(15), DateOfBirth: DATE, Gender: ENUM('M','F','O'), DiabetesType: ENUM('GDM','T1D','T2D') | UserID          | None             | 1-N with GlucoseReading, Medication, Appointment |
| **E-02**  | **Doctor**         | DoctorID: INT, Email: VARCHAR(50), FullName: VARCHAR(100), LicenseNumber: VARCHAR(20), Specialization: VARCHAR(100), Hospital: VARCHAR(200)                                              | DoctorID        | None             | 1-N with PatientDoctor, Appointment              |
| **E-03**  | **PatientDoctor**  | PatientDoctorID: INT, UserID: INT, DoctorID: INT, Status: ENUM('Active', 'Inactive'), StartDate: DATE, EndDate: DATE                                                                     | PatientDoctorID | UserID, DoctorID | Junction table for Patient-Doctor connection     |

## 2. Health Data logging

| Entity ID | Name               | Attributes & Types                                                                                                                                                                              | PK           | FK           | Description                         |
| --------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------ | ----------------------------------- |
| **E-04**  | **GlucoseReading** | ReadingID: INT, UserID: INT, GlucoseValue: DECIMAL(5,2), ReadingType: ENUM('CGM','SMBG','Manual'), MealContext: ENUM('Before','After','Fasting','Bedtime'), ReadingTime: TIMESTAMP, Notes: TEXT | ReadingID    | UserID       | Primary health metric tracking      |
| **E-05**  | **Meal**           | MealID: INT, UserID: INT, MealType: ENUM('Breakfast','Lunch','Dinner','Snack'), CarbsEstimate: DECIMAL(5,2), Description: TEXT, ImageURL: VARCHAR(255), MealTime: TIMESTAMP                     | MealID       | UserID       | Food diary for glycemic correlation |
| **E-06**  | **Medication**     | MedicationID: INT, UserID: INT, Name: VARCHAR(100), Dosage: VARCHAR(50), Frequency: VARCHAR(50), Instructions: TEXT                                                                             | MedicationID | UserID       | Prescription management             |
| **E-07**  | **MedicationLog**  | LogID: INT, MedicationID: INT, Status: ENUM('Taken','Missed'), LogTime: TIMESTAMP                                                                                                               | LogID        | MedicationID | Compliance tracking                 |

## 3. Analytics & Management

| Entity ID | Name             | Attributes & Types                                                                                                                              | PK        | FK               | Description                     |
| --------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------------- | ------------------------------- |
| **E-09**  | **HealthReport** | ReportID: INT, UserID: INT, TIR: DECIMAL(4,2), AvgGlucose: DECIMAL(5,2), HbA1cEstimate: DECIMAL(4,2), GlycemicVariability: DECIMAL(5,2)         | ReportID  | UserID           | Aggregated analytics output     |
| **E-10**  | **DataSharing**  | SharingID: INT, UserID: INT, DoctorID: INT, SharingType: ENUM('RealTime','Report','Manual'), IsActive: BOOLEAN, Permissions: JSON               | SharingID | UserID, DoctorID | Granular access control for PHI |
| **E-11**  | **Device**       | DeviceID: INT, UserID: INT, DeviceName: VARCHAR(100), DeviceType: ENUM('CGM','SMBG','Manual'), ConnectionType: ENUM('Bluetooth','API','Manual') | DeviceID  | UserID           | IoT/External device management  |

## 4. Support & Knowledge

| Entity ID | Name                 | Attributes & Types                                                                                                          | PK        | FK     | Description                      |
| --------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------- | ------ | -------------------------------- |
| **E-12**  | **KnowledgeArticle** | ArticleID: INT, Title: VARCHAR(200), Content: TEXT, Category: VARCHAR(100), Language: ENUM('VI','EN'), IsPublished: BOOLEAN | ArticleID | None   | CMS for medical articles         |
| **E-13**  | **ChatSession**      | SessionID: INT, UserID: INT, SessionType: ENUM('AI','Doctor'), Status: ENUM('Active','Closed')                              | SessionID | UserID | Logging for support/medical chat |

---

### 🛡️ Architect's Implementation Enforcement:

1. **UUID vs INT:** While the CSV uses `INT` for simplicity, my architecture **requires UUIDv4** for all `ID` fields to prevent ID guessing attacks.
2. **Naming Convention:** Tables must be **plural** (`glucose_readings`), columns must be **camelCase** (`glucoseValue`).
3. **MealContext (E-04):** This field is vital. If a `GlucoseValue` is saved without `MealContext`, the `AnalyticsService` must flag it as "Incomplete Data."
4. **Permissions (E-10):** The `Permissions` JSON column must be used to filter which attributes a Doctor can see (e.g., `{"view_glucose": true, "view_meals": false}`).
5. **Enums:** Ensure `diabetes_type` enum matches the CSV values: `GDM`, `T1D`, `T2D`.
