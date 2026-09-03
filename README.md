# Exim-Export: Comprehensive Enterprise Export DSR, Operations & Billing System

Welcome to the **Exim-Export** repository. This document provides an exhaustive, end-to-end technical and functional reference for the entire project. It covers the microservices architecture, cross-project integrations, third-party services, core workflow conditions, role-based business rules, and a complete catalog of API endpoints.

---

## 📐 1. System Architecture & Tech Stack

Exim-Export is designed as a **Modular Monolith** integrated with specialized **Microservices**, auxiliary tools, and cross-project sync services.

```
                  +-----------------------------------+
                  |      React Single Page App        |
                  |  (Material-UI, SCSS, Formik/Yup)  |
                  +-----------------+-----------------+
                                    |
                                    v  REST API / JSON
                  +-----------------+-----------------+
                  |      Express.js API Server        |
                  |     (Node.js ESM/CJS Hybrid)      |
                  +----+--------+---------+---------+-+
                       |        |         |         |
     +-----------------+        |         |         +------------------+
     |                          |         |                            |
     v                          v         v                            v
+----+------------+    +--------+---+  +--+-------------+     +--------+-------+
|  MongoDB Database|    | AWS S3     |  | Local Signer   |     | Imexcube      |
|  (Mongoose ORM) |    | Bucket     |  | Microservice   |     | Cross-Project |
+-----------------+    +------------+  +----------------+     +---------------+
                                          (Java / USB DSC)
```

### Technology Stack
* **Frontend**: React (Vite / CRA bundle), Material-UI (MUI v5), SCSS / CSS Modules, FontAwesome, Formik + Yup, Axios.
* **Backend**: Node.js (ES Modules & CommonJS), Express.js framework, Mongoose (MongoDB ORM), Winston Logger, Nodemailer, Axios.
* **Database**: MongoDB (centralized document store for Export Jobs, Queries, Virtual Balances, Users, and Audit Logs).
* **Cloud Storage**: AWS S3 (`uploadFileToS3`, S3 bucket for PDF documents, checklists, stuffing photos, weighment images, LEO copies, gate passes, billing documents).
* **Local Microservice**: Standalone Java-based PKCS#11 / USB Token DSC Digital Signer (`local-signer`).

---

## ⚙️ 2. Microservices, Auxiliary Tools & Cross-Project Integrations

### 🔌 A. Local Signer Microservice (`/local-signer`)
* **Purpose**: A standalone Java agent that interfaces directly with USB Token hardware (PKCS#11 drivers) to perform client-side digital signatures on PDF files and ICEGATE XML/flat files without transmitting private keys.
* **Key Components**:
  * `local-signer/src`: Java source code for PKCS#11 token detection and PDF signing.
  * `signerRoutes.js`: Server-side helper routes for preparing unsigned digests and verifying signed certificates.
  * `cert_success.der` / `cert_fail.der`: Certificate validation fixtures.

### 🔄 B. Imexcube Cross-Project Integration (`eximclientnew` Proxy)
* **Purpose**: Seamless bi-directional data synchronization with external Imexcube Customs clearance software.
* **Integration Files**:
  * `server/routes/uploadToImexcube.mjs`
  * `server/routes/uploadExportToImexcube.mjs`
  * `eximclientnew/server/controllers/exportProxyController.js`
* **Functionality**: Pushes finalized job parameters, invoice details, product drawback claims, and shipping bill declarations to Imexcube for customs filing.

### 📊 C. Tally ERP Accounting Integration
* **Purpose**: Financial voucher bridging and job billing aggregation.
* **Key Feature - Tally Clubbing**: Allows multiple individual export jobs to be grouped under a single `tally_club_ref_no` (`clubJobRoutes.mjs`, `ExportBillingPage.jsx`).
* **Output**: Generates standardized Accounts Receivable (AR) and Accounts Payable (AP) invoice records formatted for Tally ingestion.

### ⏱️ D. Automated DSR Cron & Notification Engine
* **Cron Job**: `server/jobs/dsrJob.mjs` runs scheduled background routines.
* **Excel Report Generator**: `server/utils/dsrReportGenerator.mjs` builds comprehensive daily/hourly DSR Excel workbooks per exporter.
* **Mailer Service**: `server/utils/mailer.mjs` & `server/routes/export-dsr/testDsrEmail.mjs` dispatch automated status emails to exporter clients via Nodemailer.

---

## 🌐 3. Third-Party APIs & Service Integrations

1. **ICEGATE (Indian Customs EDI Gateway)**:
   * **Flat File Generator (`generateFlatFile.mjs`)**: Generates standard RES format flat files for direct submission to Indian Customs ICEGATE.
   * **Live SB Tracking (`sbTrack.mjs`, `SBTrackDialog.js`)**: Real-time status lookup of Shipping Bills on ICEGATE servers.
   * **eSanchit Document Upload**: Document classification, Image Reference Number (IRN) generation, and PKCS#7 signature binding.
2. **ODEX (Online Document Exchange)**:
   * Automated electronic document filing for:
     * ODEX VGM (Verified Gross Mass)
     * ODEX Form 13 (Gate-in permission)
     * ODEX ESB (Electronic Shipping Bill)
     * CMA CGM Forwarding Note submission
3. **AWS S3 Storage**:
   * Storage of documents, container stuffing photos, weighment images, LEO copies, gate passes, billing document uploads (`uploadFileToS3`, `deleteFromS3.js`, `handleS3Deletation.mjs`).
4. **Live Container & Port Tracking**:
   * Multi-line container status tracking dialog (`ContainerTrackDialog.js`, `transportData.mjs`).

---

## 📋 4. Modules, Business Logic & Critical Conditions

The application is structured into four core functional modules, each governed by strict business logic rules.

```
       +-------------------------------------------------------------+
       |                     EXPORT DSR MODULE                       |
       |  - Job Creation (FCL, LCL, Air, Sea, General)               |
       |  - Document Click Tracking ("Custome file generated")        |
       +------------------------------+------------------------------+
                                      |
                                      v
       +-------------------------------------------------------------+
       |                     OPERATIONS MODULE                       |
       |  - Operational Lock (`operational_lock`)                     |
       |  - Milestone dates (Placement, Rail Out, Reached, LEO)       |
       +------------------------------+------------------------------+
                                      |
                                      v (Requires Rail Out/Road Out + Reached Dates)
       +-------------------------------------------------------------+
       |                 CHARGES & BILLING MODULE                    |
       |  - Toggles `send_for_billing: true`                          |
       |  - Remotely removes "Custome file generated" tag            |
       |  - Engages Financial Lock for Non-Admins                     |
       +------------------------------+------------------------------+
                                      |
                                      v
       +-------------------------------------------------------------+
       |               DOCUMENTATION & ESANCHIT MODULE               |
       |  - SB Filing, EGM, Flat File RES, eSanchit Uploads, DSC     |
       +-------------------------------------------------------------+
```

---

### 🟢 A. Export DSR & Jobs Module (`/export-dsr`)

#### 1. Job Types & Prefixing
* Supports **Containerized (FCL/LCL)**, **Air**, and **General (Non-containerized)** jobs across **Sea** and **Air** transport modes.
* Job numbers are automatically generated with branch prefixes (e.g. `AMD/EXP/SEA/01025/26-27`).

#### 2. Document Click Tracking & "Custome file generated" Tag Rule
* The system tracks generator click events on 3 key standard documents via the `docClicks` object on the job:
  * Checklist (`docClicks.checklist.clickedBy`)
  * File Cover (`docClicks.file_cover.clickedBy`)
  * eSanchit (`docClicks.esanchit.clickedBy`)
* **Tag Trigger Condition**:
  ```javascript
  const hasCustomFileGenerated =
    checklistUser &&
    fileCoverUser &&
    esanchitUser &&
    checklistUser === fileCoverUser &&
    checklistUser === esanchitUser &&
    !job.send_for_billing;
  ```
  * **When Active**: Displays a green badge `Custome file generated: <UserName>` under the Job No column and highlights the Job No cell with light green background (`#e6f4ea`).
* **Tag Removal Condition**:
  * **CRITICAL RULE**: As soon as the job is sent for billing (`job.send_for_billing === true`), the `Custome file generated` tag **MUST BE REMOVED** immediately from the UI, and the cell background returns to default.

---

### ⚙️ B. Operations Module (`/export-operation`)

#### 1. Operational Lock (`operational_lock`)
* Once operational milestones are submitted, `operational_lock` is activated to prevent non-operational users from tampering with logistics parameters.

#### 2. Operational Milestone Tracking & Tabs
* **Tabs**: `Pending`, `Handover Pending`, `Op Completed`, `Completed`.
* **Tracked Dates & Attachments**:
  * Container Placement Date (`operations.statusDetails.containerPlacementDate`)
  * Handover Forwarding Note Date (`operations.statusDetails.handoverForwardingNoteDate`)
  * Handover Concor / Thar / Sangana Rail / Road Date (`operations.statusDetails.handoverConcorTharSanganaRailRoadDate`)
  * LEO Date (`operations.statusDetails.leoDate`) & LEO Document Upload
  * Rail Out / Road Out Date and Reached Date (`operations.statusDetails.railOutReachedDate`)
  * Milestone Uploads: CLP, Forwarding Note, Stuffing Sheet/Photos, Gate Pass, Handover Images, Movement Copy, Assessment Copy, Completion Copy.

---

### 💳 C. Charges & Billing Module (`/export-charges`, `/export-billing`)

#### 1. Mandatory Conditions to Send Job for Billing (`send_for_billing`)
* **CRITICAL VALIDATION RULE**: For all regular containerized sea export jobs (Non-Air, Non-LCL, Non-General, Non-Freight-Forwarding):
  * A job **CANNOT** be sent for billing unless BOTH of the following dates are filled:
    1. **Rail Out / Road Out Date**
    2. **Reached Date**
  * If a user attempts to toggle `send_for_billing: true` without these dates, the system raises an alert:
    > *"Cannot send for billing: Rail Out/Road Out date and Reached date are required."*

#### 2. Financial Lock & Rejection Rules
* **Financial Lock**: Setting `send_for_billing: true` records `send_for_billing_date` and locks financial parameters for non-admin users.
* **Tag Cleanup**: Hides the `Custome file generated` tag automatically.
* **Billing Rejection**: Non-admins or billing officers can reject a job sent for billing by setting `send_for_billing: false`, which clears `send_for_billing_date` and returns the job to Charges Pending.

#### 3. Billing Hub Features
* **Tabs**: `Billing Pending`, `Club Jobs`, `Billing Completed`.
* **Club Jobs**: Allows grouping multiple export jobs belonging to the same exporter into a single billing entity using `tally_club_ref_no`.
* **Financial Registers**: AR/AP ledger, Reimbursement Bills, Agency Bills, TDS Payable Register, Billing Charges Excel Hub, Penalty & Late Filing tracking, Virtual Balance Manager (`/api/virtual-balance`).

---

### 📄 D. Documentation & eSanchit Module (`/export-documentation`, `/export-esanchit`)

* Manages Shipping Bill filing parameters (SB No, SB Date, EGM No, EGM Date, Drawback Scroll, ROSCTL Scroll).
* **Flat File Generator**: Builds customs-compliant `.RES` flat files for ICEGATE portal uploading (`generateFlatFile.mjs`).
* **eSanchit Hub**: Handles document classification, filename normalization, and PKCS#7 digital signature integration.
* **Standard Document Generators**:
  * Export Checklist (`ExportChecklistGenerator.js`)
  * File Cover (`FileCoverGenerator.js`)
  * Consignment Note (`ConsignmentNoteGenerator.js`)
  * Forwarding Note Thar / Concor Generators
  * VGM Authorization (`VGMAuthorizationGenerator.js`)
  * Annexure C & Annexure D Generators
  * Carting, Stuffing, and Movement Job Request Generators
  * Storage Application & Certificate of Origin Generators
  * Import Container Delivery Order & Buffer Container Gate-In Generators

---

### ❓ E. Query Management & UI Color Coding Rules

* **Query System (`/api/queries`, `/api/client-queries`)**: Facilitates real-time communication between operational staff and clients regarding missing documents or discrepancies.
* **UI Row / Cell Background Color Rules**:
  1. `Light Green (#e6f4ea)`: Job has `Custome file generated` (all 3 docs generated by same user AND `!job.send_for_billing`).
  2. `Soft Orange (#ffedd5)`: Shipping Bill or Seal number notification flag (`sb_or_seal_changed_notif`).
  3. `Soft Red (#fee2e2)`: Job has open client queries (`hasOpenClientQueries === true`).
  4. `Soft Yellow (#f7f6d3cc)`: Operational lock active (`operational_lock === true`).

---

## 📡 5. Complete API Endpoints Reference

Below is the exhaustive catalog of backend REST API routes exposed by the Exim-Export server:

### 🔹 Export Jobs & DSR APIs (`server/routes/export-dsr/`)
| Method | Endpoint Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/export-jobs/export-dsr` | Fetch paginated export jobs list with filtering & sorting |
| `GET` | `/api/get-export-job/:jobNo` | Fetch complete job object by Job Number |
| `POST` | `/api/export-jobs/add` | Create a new export job manually |
| `POST` | `/api/export-jobs/excel-upload` | Bulk upload export jobs via Excel sheet |
| `PUT` | `/api/export-jobs/update/:jobNo` | Update export job (enforces operational & financial locks) |
| `GET` | `/api/export-jobs-tab-counts` | Get real-time job counts for DSR tabs |
| `GET` | `/api/get-exjobs-overview/:year` | Get fiscal year summary stats for export jobs |
| `GET` | `/api/exporter-list` | Get list of distinct exporters |
| `GET` | `/api/dsr/manufacturers` | Get manufacturer list for DSR dropdowns |
| `GET` | `/api/dsr/consignees` | Get consignee list for DSR dropdowns |
| `GET` | `/api/dsr/ho-to-console-names` | Get HO to console name mappings |
| `GET` | `/api/get-exporter-list/:year` | Year-specific exporter lookup |
| `GET` | `/api/export-dsr/historical-freight` | Fetch historical freight rate logs |

### 🔹 Operations APIs
| Method | Endpoint Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/operation-jobs/:status?` | Fetch jobs list for Operations module |
| `GET` | `/api/operation-pending-jobs` | Fetch jobs with pending operational milestones |
| `GET` | `/api/operation-jobs-filters` | Get filter options (ports, lines, branches) for operations |
| `GET` | `/api/operation-jobs-exporter-names` | Get exporter options for operations module |

### 🔹 Charges & Billing APIs
| Method | Endpoint Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/export-billing-jobs` | Fetch jobs for Billing module (Pending, Clubbed, Billed) |
| `POST` | `/api/export-billing/club-jobs` | Group multiple jobs under a `tally_club_ref_no` |
| `PUT` | `/api/export-billing/reject-billing` | Reject job sent for billing (resets `send_for_billing`) |
| `GET` | `/api/virtual-balance` | Fetch virtual balance records & account balances |
| `GET` | `/api/virtual-balance/job-details/:jobNo` | Fetch virtual balance details for a specific job |
| `GET` | `/api/virtual-balance/job-purchase-books` | Fetch purchase books audit trail for virtual balances |
| `GET` | `/api/virtual-balance/created-terminals` | Fetch list of created balance terminals |

### 🔹 Report & Analytics APIs (`server/routes/report/` & `exportAnalyticsRoutes.mjs`)
| Method | Endpoint Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/export-analytics/overview` | Fetch analytics KPIs, volumes, and revenue metrics |
| `GET` | `/api/export-analytics/pulse` | Fetch real-time Pulse TV metric dashboard data |
| `GET` | `/report/billing-pending` | Fetch detailed billing pending jobs report |
| `GET` | `/report/tds-payable-register` | Fetch TDS payable register report |
| `GET` | `/report/billing-charges-excel` | Export billing charges report as Excel file |
| `GET` | `/api/export-dsr/generate-dsr-report` | Generate and download full DSR Excel report |

### 🔹 Document Generation & Customs APIs
| Method | Endpoint Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/export-checklist/:job_no` | Generate Export Checklist HTML/PDF |
| `GET` | `/api/generate-sb-file/:jobId` | Generate ICEGATE Shipping Bill `.RES` flat file |
| `POST` | `/api/track-doc-click` | Track document generation click (`docClicks`) |
| `POST` | `/api/upload-to-imexcube` | Sync job data to Imexcube Customs software |
| `POST` | `/api/upload-export-to-imexcube` | Sync export job parameters to Imexcube |

### 🔹 Tracking & Freight Enquiry APIs
| Method | Endpoint Path | Description |
| :--- | :--- | :--- |
| `POST` | `/api/sb-track` | Query ICEGATE live Shipping Bill status |
| `GET` | `/api/transportData` | Transport & container movement data lookup |
| `GET` | `/freight-enquiries` | Fetch freight forwarding rate enquiries |
| `POST` | `/freight-enquiries` | Create a new freight enquiry |
| `GET` | `/freight-forwarding/generate-dsr` | Generate DSR for freight forwarding jobs |

### 🔹 Queries & Audit APIs
| Method | Endpoint Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/queries` | Fetch internal queries |
| `GET` | `/api/client-queries` | Fetch client-facing queries |
| `POST` | `/api/queries/raise` | Raise a new query on a job |
| `PUT` | `/api/queries/resolve/:id` | Resolve an open query |
| `GET` | `/api/audit-logs` | Fetch system audit trail logs |

### 🔹 Authentication & User APIs
| Method | Endpoint Path | Description |
| :--- | :--- | :--- |
| `POST` | `/api/login` | Authenticate user & issue JWT token |
| `GET` | `/api/get-user` | Fetch active user session & branch permissions |
| `GET` | `/api/get-all-users` | Fetch all system users (Admin view) |
| `GET` | `/api/export-jobs-module-users` | Fetch user list authorized for export modules |

---

## 🚀 6. Installation & Deployment Guide

### Environment Setup (`.env`)
Ensure `.env` files are configured in both `server/` and `client/` directories:

**Server (`server/.env`)**:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/exim_export
JWT_SECRET=your_jwt_secret_key
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=ap-south-1
AWS_S3_BUCKET=exim-export-documents
```

**Client (`client/.env`)**:
```env
REACT_APP_API_STRING=http://localhost:5000
```

### Running Locally

1. **Start the Backend Server**:
   ```bash
   cd server
   npm install
   npm run dev
   ```

2. **Start the Frontend Client**:
   ```bash
   cd client
   npm install
   npm run dev
   ```

3. **(Optional) Launch Local Signer Microservice**:
   ```bash
   cd local-signer
   run.bat
   ```

### Production Docker Deployment

To build and publish the server Docker container:
```bash
cd server
docker build -t punit084/exim-export .
docker push punit084/exim-export
```

---

## 📜 7. License & Maintainers

* **Repository Owner**: Novusha-LPP / Exim-Export
* **System Contact**: Development Team
