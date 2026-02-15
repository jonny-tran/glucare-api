# Functional Specifications: User Stories & Use Cases

## 1. User Stories (Targeting Acceptance Criteria)

### A. Patient Module

| ID        | User Story                                   | Acceptance Criteria (AC)        | Priority |
| --------- | -------------------------------------------- | ------------------------------- | -------- |
| **US-01** | As a Patient, I want to register and log in. | - Register via Email/Phone.<br> |

<br>- Secure password login.<br>

<br>- Proper error handling for invalid credentials. | High |
| **US-02** | As a Patient, I want to log glucose and health data. | - Support Manual, Device (CGM/SMBG), and AI (Voice/OCR).<br>

<br>- Data must be saved and retrievable. | High |
| **US-03** | As a Patient, I want to view health trends and reports. | - Daily/Weekly/Monthly views.<br>

<br>- Display Charts, TIR, and Estimated HbA1c.<br>

<br>- Show "No Data" state if empty. | High |
| **US-04** | As a Patient, I want to set daily reminders. | - Toggle on/off.<br>

<br>- Custom time settings.<br>

<br>- Accurate push notifications. | Medium |
| **US-05** | As a Patient, I want to share data with my doctor. | - Sync toggle (On/Off).<br>

<br>- Clear indication of sharing status. | High |
| **US-06** | As a Patient, I want to read my doctor’s notes. | - Clear medical feedback display.<br>

<br>- Notification on new notes. | Medium |

### B. Doctor Module

| ID        | User Story                                       | Acceptance Criteria (AC)      | Priority |
| --------- | ------------------------------------------------ | ----------------------------- | -------- |
| **US-07** | As a Doctor, I want to view shared patient data. | - Patient selection list.<br> |

<br>- View detailed Glucose trends, TIR, and HbA1c. | High |
| **US-08** | As a Doctor, I want to add medical notes for patients. | - Input field for feedback.<br>

<br>- Successful save triggers patient notification. | Medium |

---

## 2. Core Use Cases (Main Logic Flows)

### UC-02: Health Data Logging (Highest Complexity)

- **Actor:** Patient
- **Preconditions:** User is logged in.
- **Main Flow:**

1. User selects data type (Glucose, Meal, Medication, etc.).
2. User inputs data (Manual/AI/Device).
3. System validates data (Refer to BR-01, BR-07).
4. System saves data and updates local/remote cache.

- **Alternate Flow:** If offline, save to local storage and sync when internet is restored.
- **Postconditions:** Data is available for analytics (UC-03).

### UC-03: View Reports & Analytics

- **Actor:** Patient
- **Preconditions:** Data exists in the system.
- **Main Flow:**

1. User selects time range (7/14/30 days).
2. System aggregates data and calculates ADA metrics (TIR, HbA1c).
3. System renders visual charts (Line charts).

- **Postconditions:** User gains insight into glycemic control.

### UC-05: Data Synchronization (Sharing)

- **Actor:** Patient
- **Preconditions:** Doctor is linked to the account.
- **Main Flow:**

1. User navigates to Sharing Settings.
2. User enables "Data Sync."
3. System updates permissions in the `DataSharing` table (E-10).

- **Postconditions:** Doctor can now access the patient's dashboard (UC-07).

---

## 3. Implementation Guardrails for Backend

- **For US-01 (Auth):** Use the established `AuthModule` with JWT. Ensure the `Role` (Patient/Doctor/Admin) is strictly checked for every endpoint.
- **For UC-02 (Logging):** The API must support an `is_offline` flag or handle timestamp conflicts if data is synced late.
- **For US-07 (Doctor Access):** Strictly enforce the **One-Way Access** rule (FR-05). Doctors can **Read** patient data but **Cannot Edit** their glucose records.

---

### 🛡️ Architect's Closing Note:

Bro, these Use Cases define our **Post-Conditions**. When you tell the Agent to code, tell it: \_"The Post-condition of UC-02 must be met: data must be saved and ready for UC-03 calculation."
