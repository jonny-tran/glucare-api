# Business Rules: GlucoDia (Gluecare)

## 1. Data Input & Management

| Rule ID   | Category      | Business Rule Description                                                                             | Rationale                                                 |
| --------- | ------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **BR-01** | Functional    | The application MUST support manual data entry for glucose, HbA1c, medication, and physical activity. | Ensures functionality for users without CGM/SMBG devices. |
| **BR-05** | AI/Functional | AI-assisted voice input MUST be supported for logging health data.                                    | Reduces friction and manual effort for patients.          |
| **BR-06** | AI/Functional | AI-assisted image recognition (OCR) MUST be supported for recognizing meals and prescriptions.        | Enhances data logging speed and accuracy.                 |
| **BR-10** | Usability     | Patients MUST be able to toggle daily data entry reminders (On/Off).                                  | Increases treatment compliance without being intrusive.   |

## 2. Medical Analysis & Analytics

| Rule ID   | Category   | Business Rule Description                                                                                              | Rationale                                                  |
| --------- | ---------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **BR-08** | Functional | Data MUST be viewable by Day, Week, and Month.                                                                         | Essential for patients and doctors to track health trends. |
| **BR-09** | Medical    | If a patient does not use CGM, the system MUST still provide Time-in-Range (TIR) reports based on manual/SMBG entries. | Ensures core clinical metrics are available for all users. |
| **BR-07** | Compliance | AI features provide **Support only**; they MUST NOT replace professional medical diagnosis.                            | Legal protection and medical safety.                       |

## 3. Data Sharing & Collaboration

| Rule ID   | Category     | Business Rule Description                                                          | Rationale                                       |
| --------- | ------------ | ---------------------------------------------------------------------------------- | ----------------------------------------------- |
| **BR-02** | Data Sharing | Data is shared with doctors ONLY if the patient enables synchronization.           | Ensures patient privacy and consent.            |
| **BR-12** | Functional   | Doctors MUST be allowed to add notes and provide feedback directly within the app. | Facilitates remote monitoring and patient care. |

## 4. Compliance & UI/UX

| Rule ID   | Category   | Business Rule Description                                                                | Rationale                                             |
| --------- | ---------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **BR-03** | Usability  | The app MUST support multi-language (at least Vietnamese and English).                   | Accessibility for diverse patient groups.             |
| **BR-04** | Compliance | The system MUST comply with medical data security standards (e.g., HIPAA or equivalent). | Protects sensitive Personal Health Information (PHI). |
| **BR-11** | Usability  | Patient UI must be simplified; Doctor UI must be advanced with comprehensive dashboards. | Meets the distinct needs of different user roles.     |

---

### 🛡️ Architect's Implementation Note for Backend:

- **For BR-09 (TIR Calculation):** Your `AnalyticsService` must handle cases where data points are sparse (manual entry) vs. dense (CGM). The formula remains the same, but you must flag the "confidence level" of the report.
- **For BR-02 (Sharing):** The `DataSharing` table (E-10) is the gatekeeper. Every health data query from a Doctor's account must first check the `IsActive` flag and `Permissions` JSON in E-10.
- **For BR-07 (AI Support):** All AI-generated insights in the `ChatSession` (E-13) or `Dashboard` must be stored with a disclaimer flag to meet legal requirements.
