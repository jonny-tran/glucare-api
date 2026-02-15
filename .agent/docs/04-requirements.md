# System Requirements Specification (SRS)

## 1. Functional Requirements (FR)

These define the specific behaviors and features the backend must implement.

| Req ID    | Requirement Description                              | Category        | Priority | Acceptance Criteria (AC)                                     |
| --------- | ---------------------------------------------------- | --------------- | -------- | ------------------------------------------------------------ |
| **FR-01** | Manual glucose data entry (mg/dL).                   | Data Management | **High** | Users can save values manually; data must appear in history. |
| **FR-02** | Voice-to-Data input via AI.                          | Data Input      | Medium   | Speaking a value (e.g., "120") saves "120 mg/dL" correctly.  |
| **FR-03** | Image-to-Data (OCR) for machine readings.            | Data Input      | Medium   | System extracts numerical data with accuracy.                |
| **FR-04** | Medical Analytics (TIR, TBA, TBA, AUC, Variability). | Analytics       | **High** | Indicators must be clear and follow **ADA standards**.       |
| **FR-05** | Doctor view (Read-only access).                      | Data Access     | **High** | Doctors can view but **cannot modify** patient data.         |
| **FR-06** | Privacy Control (Sync Toggle).                       | Privacy         | **High** | On: Visible to Doctor; Off: Data is hidden from Doctor.      |
| **FR-07** | Daily automated reminders.                           | Notification    | **High** | Users receive push notifications at configured times.        |
| **FR-08** | Visual Data Trends (Line Charts).                    | Visualization   | Medium   | View trends for 7, 14, and 30-day intervals.                 |
| **FR-09** | Admin User Management.                               | Administration  | Medium   | Admin can create, delete, or lock user accounts.             |
| **FR-10** | Admin Content Management (Blog/Knowledge).           | Content Mgmt    | Low      | Blogs appear in-app only after Admin publishes them.         |

## 2. Non-Functional Requirements (NFR)

These define the quality attributes and constraints of the system.

| Req ID     | Requirement Description                                   | Category   | Priority | Implementation Strategy                                        |
| ---------- | --------------------------------------------------------- | ---------- | -------- | -------------------------------------------------------------- |
| **NFR-01** | Multi-language support (VI, EN).                          | Usability  | **High** | Use i18n libraries; UI changes based on user preference.       |
| **NFR-02** | Role-specific UI/UX (Simple for Patient, Pro for Doctor). | UX/UI      | **High** | Backend must return different data structures based on `Role`. |
| **NFR-03** | Medical Data Security (Anonymization/Sync).               | Compliance | **High** | Encrypt PHI; strictly follow Sync Toggle logic (GDPR/HIPAA).   |
| **NFR-04** | AI Legal Disclaimer.                                      | Compliance | **High** | Every AI insight must include a "Not a medical diagnosis" tag. |

---

### 🛡️ Architect's Technical Implementation Guide:

1. **For FR-04 (Analytics Engine):** Do not perform heavy math inside the Controller. Use a dedicated `AnalyticsService` in the `Glucose` module. Calculations like **TIR** (Time in Range) must strictly use the 70-180 mg/dL range unless specified otherwise in User Profile.
2. **For FR-05 & FR-06 (Access Control):** In your `PatientDoctorRepository`, implement a strict check. Before a Doctor can `GET` patient data, the query must verify:

- A valid link exists in `patient_doctors`.
- `is_active` is `true` in the `data_sharing` table.

3. **For FR-07 (Notifications):** Use **BullMQ** or **NestJS Task Scheduling** (Cron) for reminders. Do not rely on simple `setTimeout` as it won't survive a server restart.
4. **For NFR-03 (Security):** Ensure all `patientId` fields in your DB are **UUIDv4**. This prevents ID enumeration attacks where users guess other patients' IDs.
