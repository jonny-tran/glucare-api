### File: `docs/01-project-overview.md`

# Project Overview: GlucoDia (Gluecare)

## 1. General Information

| Attribute             | Details                                                                       |
| --------------------- | ----------------------------------------------------------------------------- |
| **Project Code**      | FA25_32_SWD392                                                                |
| **Group Code**        | G-02                                                                          |
| **Project Name (EN)** | GlucoDia - Smart Diabetes Management App                                      |
| **Project Name (VN)** | Hệ thống quản lý đường huyết cho người bệnh                                   |
| **Stakeholders**      | Patients, Doctors, Administrators                                             |
| **Target Audience**   | Gestational Diabetes Mellitus (GDM), Type 1 (T1D), and Type 2 (T2D) patients. |

## 2. Context & Problem Statement

### The Challenge

Current market solutions for diabetes management often lack:

- Integration of diverse data sources (CGM, SMBG, Manual).
- Native support for the Vietnamese language.
- Personalization, especially for Gestational Diabetes (GDM) patients.

### Proposed Solutions

GlucoDia aims to solve these by providing:

- **Flexible Data Collection**: Supporting CGM/SMBG via Bluetooth/API, manual entry, and AI-assisted inputs (Voice, Image/OCR).
- **Advanced Analytics**: Real-time calculation of **Time in Range (TIR)**, Time Above/Below Range, Estimated **HbA1c**, Glycemic Variability, and AUC.
- **Medical Connectivity**: Secure data sharing between patients and doctors for real-time monitoring.
- **AI Integration**: Personalizing insights and simplifying data logging.

## 3. Technical Constraints & Assumptions

### Assumptions (A)

- **A-01**: Patients have smartphones with stable internet connections.
- **A-02**: Healthcare providers are willing to use the platform to monitor shared patient data.
- **A-03**: AI models (Voice-to-Data, OCR) provide acceptable accuracy for medical logging.
- **A-04**: The system must maintain a bilingual interface (Vietnamese & English).

### Constraints (C)

- **C-01 (Compliance)**: Must comply with healthcare data privacy regulations (**HIPAA**, GDPR, or local laws).
- **C-02 (Finances)**: No direct refunds to banks; credits must be managed internally within the app.
- **C-03 (Timeline)**: MVP must be delivered within a **6-month** window.
- **C-04 (Platform)**: Native-like performance required on both **Android and iOS**.

---

### 🛡️ Architect's Note:

I have extracted only the essential "Source of Truth" data. I avoided adding fluff. When you feed this to your Agent, it will immediately understand that **TIR** and **HbA1c** are core KPIs and that **GDM** is our primary target niche.
