# Backend Development Document

Dokumen ini menjadi acuan awal pengembangan backend untuk sistem NLP kesehatan berbasis Express.js dan TypeScript. Sistem menerima keluhan kesehatan dalam bentuk teks dari pasien, memprosesnya menggunakan AI model internal, dan memberikan hasil pre-screening kepada dokter untuk ditinjau lebih lanjut.

---

## 0. Technical Decisions

Beberapa keputusan dasar yang digunakan dalam dokumen ini:

| Area              | Decision                                         |
| ----------------- | ------------------------------------------------ |
| Backend Framework | Express.js                                       |
| Language          | TypeScript                                       |
| API Style         | REST API                                         |
| API Version       | `/api/v1`                                        |
| Primary ID        | UUID                                             |
| Authentication    | JWT Bearer Token                                 |
| Patient Entity    | Terpisah                                         |
| Doctor Entity     | Terpisah                                         |
| Admin Entity      | Terpisah                                         |
| AI Processing     | Internal AI model                                |
| AI Result Access  | Doctor dan Admin                                 |
| Patient AI Access | Tidak diberikan secara langsung                  |
| Doctor Assignment | Doctor self-claim untuk MVP                      |
| Data Deletion     | Soft-disable melalui `status`, bukan hard delete |

### Open Technical Decisions

Keputusan berikut perlu ditentukan sebelum fase terkait dimulai:

- Database yang digunakan.
- ORM/query builder yang digunakan.
- Bentuk integrasi AI model internal: module, process, worker, atau internal service.
- Infrastruktur queue/background worker jika inference dilakukan asynchronous.
- Target deployment: VPS, container, cloud, atau internal server.
- Kebijakan retention data kesehatan.
- Apakah authentication ke depannya membutuhkan refresh token dan server-side session revocation.

---

# 1. Data Schema

## 1.1 Entity Overview

| Entity           | Function                              |
| ---------------- | ------------------------------------- |
| `patients`       | Menyimpan akun dan data dasar pasien  |
| `doctors`        | Menyimpan akun dan data dokter        |
| `admins`         | Menyimpan akun administrator          |
| `consultations`  | Menyimpan keluhan yang dikirim pasien |
| `ai_analyses`    | Menyimpan hasil pre-screening AI      |
| `doctor_reviews` | Menyimpan hasil review dokter         |
| `audit_logs`     | Menyimpan aktivitas penting sistem    |

### Main Relationship

```text
patients
   │
   │ 1
   │
   └────────< consultations >────────┐
                    │                │
                    │                │
                    │ 1              │ N
                    │                │
                    ▼                ▼
              ai_analyses         doctors
                    │
                    │
                    │
                    ▼
              doctor_reviews

consultations
      │
      └────────< audit_logs
```

---

## 1.2 Table `patients`

| Field           | Type      | Constraint       | Description                 |
| --------------- | --------- | ---------------- | --------------------------- |
| `id`            | UUID      | PK               | ID unik pasien              |
| `name`          | VARCHAR   | NOT NULL         | Nama pasien                 |
| `email`         | VARCHAR   | UNIQUE, NOT NULL | Email pasien                |
| `phone`         | VARCHAR   | UNIQUE, NOT NULL | Nomor telepon pasien        |
| `password_hash` | VARCHAR   | NOT NULL         | Password yang sudah di-hash |
| `gender`        | VARCHAR   | NULLABLE         | Jenis kelamin pasien        |
| `birth_date`    | DATE      | NULLABLE         | Tanggal lahir pasien        |
| `status`        | ENUM      | NOT NULL         | `active`, `inactive`        |
| `created_at`    | TIMESTAMP | NOT NULL         | Waktu data dibuat           |
| `updated_at`    | TIMESTAMP | NOT NULL         | Waktu data diperbarui       |

---

## 1.3 Table `doctors`

| Field            | Type      | Constraint       | Description                  |
| ---------------- | --------- | ---------------- | ---------------------------- |
| `id`             | UUID      | PK               | ID unik dokter               |
| `name`           | VARCHAR   | NOT NULL         | Nama dokter                  |
| `email`          | VARCHAR   | UNIQUE, NOT NULL | Email dokter                 |
| `password_hash`  | VARCHAR   | NOT NULL         | Password yang sudah di-hash  |
| `specialization` | VARCHAR   | NULLABLE         | Spesialisasi dokter          |
| `license_number` | VARCHAR   | UNIQUE, NOT NULL | Nomor izin/identitas profesi |
| `status`         | ENUM      | NOT NULL         | `active`, `inactive`         |
| `created_at`     | TIMESTAMP | NOT NULL         | Waktu data dibuat            |
| `updated_at`     | TIMESTAMP | NOT NULL         | Waktu data diperbarui        |

---

## 1.4 Table `admins`

| Field           | Type      | Constraint       | Description                 |
| --------------- | --------- | ---------------- | --------------------------- |
| `id`            | UUID      | PK               | ID unik admin               |
| `name`          | VARCHAR   | NOT NULL         | Nama admin                  |
| `email`         | VARCHAR   | UNIQUE, NOT NULL | Email admin                 |
| `password_hash` | VARCHAR   | NOT NULL         | Password yang sudah di-hash |
| `status`        | ENUM      | NOT NULL         | `active`, `inactive`        |
| `created_at`    | TIMESTAMP | NOT NULL         | Waktu data dibuat           |
| `updated_at`    | TIMESTAMP | NOT NULL         | Waktu data diperbarui       |

Akun admin pertama dibuat melalui database seed atau proses provisioning internal. Tidak tersedia public admin registration endpoint.

---

## 1.5 Table `consultations`

| Field            | Type      | Constraint   | Description                      |
| ---------------- | --------- | ------------ | -------------------------------- |
| `id`             | UUID      | PK           | ID unik konsultasi               |
| `patient_id`     | UUID      | FK, NOT NULL | Relasi ke `patients.id`          |
| `doctor_id`      | UUID      | FK, NULLABLE | Dokter yang mengambil konsultasi |
| `complaint_text` | TEXT      | NOT NULL     | Keluhan pasien                   |
| `status`         | ENUM      | NOT NULL     | Status konsultasi                |
| `assigned_at`    | TIMESTAMP | NULLABLE     | Waktu konsultasi diambil dokter  |
| `reviewed_at`    | TIMESTAMP | NULLABLE     | Waktu review selesai             |
| `closed_at`      | TIMESTAMP | NULLABLE     | Waktu konsultasi ditutup         |
| `created_at`     | TIMESTAMP | NOT NULL     | Waktu dibuat                     |
| `updated_at`     | TIMESTAMP | NOT NULL     | Waktu diperbarui                 |

### Consultation Status

| Status       | Description                                         |
| ------------ | --------------------------------------------------- |
| `submitted`  | Keluhan sudah tersimpan dan menunggu proses AI      |
| `processing` | AI sedang memproses keluhan                         |
| `analyzed`   | Hasil AI sudah tersedia dan menunggu dokter         |
| `in_review`  | Konsultasi sudah diambil dan sedang ditinjau dokter |
| `reviewed`   | Review dokter sudah tersedia                        |
| `closed`     | Konsultasi selesai                                  |
| `failed`     | Proses AI gagal                                     |

### Status Transition

```text
submitted
    │
    ▼
processing
    │
    ├──────────────► failed
    │
    ▼
analyzed
    │
    ▼
in_review
    │
    ▼
reviewed
    │
    ▼
closed
```

Untuk MVP, konsultasi dengan status `failed` dapat diproses ulang oleh mekanisme internal atau admin apabila fitur retry nantinya diperlukan.

---

## 1.6 Table `ai_analyses`

| Field                    | Type      | Constraint           | Description                                     |
| ------------------------ | --------- | -------------------- | ----------------------------------------------- |
| `id`                     | UUID      | PK                   | ID unik analisis                                |
| `consultation_id`        | UUID      | FK, UNIQUE, NOT NULL | Relasi ke konsultasi                            |
| `summary`                | TEXT      | NOT NULL             | Ringkasan keluhan                               |
| `detected_symptoms`      | JSON      | NOT NULL             | Gejala yang terdeteksi                          |
| `duration`               | VARCHAR   | NULLABLE             | Durasi keluhan                                  |
| `severity_level`         | ENUM      | NOT NULL             | `low`, `medium`, `high`                         |
| `possible_category`      | VARCHAR   | NOT NULL             | Kategori keluhan                                |
| `urgency_level`          | ENUM      | NOT NULL             | `normal`, `priority`, `urgent`                  |
| `doctor_note_suggestion` | TEXT      | NULLABLE             | Catatan awal untuk dokter                       |
| `confidence_score`       | DECIMAL   | NOT NULL             | Confidence model                                |
| `model_version`          | VARCHAR   | NOT NULL             | Versi model yang digunakan                      |
| `processing_time_ms`     | INTEGER   | NULLABLE             | Lama proses inference                           |
| `raw_output`             | JSON      | NULLABLE             | Output mentah untuk evaluasi/debugging terbatas |
| `created_at`             | TIMESTAMP | NOT NULL             | Waktu analisis dibuat                           |

`raw_output` tidak boleh dikirim ke pasien dan hanya digunakan jika memang dibutuhkan untuk debugging atau evaluasi model.

---

## 1.7 Table `doctor_reviews`

| Field                 | Type      | Constraint           | Description                   |
| --------------------- | --------- | -------------------- | ----------------------------- |
| `id`                  | UUID      | PK                   | ID unik review                |
| `consultation_id`     | UUID      | FK, UNIQUE, NOT NULL | Relasi ke konsultasi          |
| `doctor_id`           | UUID      | FK, NOT NULL         | Dokter yang melakukan review  |
| `review_note`         | TEXT      | NOT NULL             | Catatan dokter                |
| `final_category`      | VARCHAR   | NULLABLE             | Kategori akhir menurut dokter |
| `final_urgency_level` | ENUM      | NULLABLE             | Urgensi akhir                 |
| `recommendation`      | TEXT      | NULLABLE             | Rekomendasi lanjutan          |
| `created_at`          | TIMESTAMP | NOT NULL             | Waktu review dibuat           |
| `updated_at`          | TIMESTAMP | NOT NULL             | Waktu review diperbarui       |

Backend harus memastikan `doctor_reviews.doctor_id` sama dengan dokter yang tercatat pada `consultations.doctor_id`.

---

## 1.8 Table `audit_logs`

| Field             | Type      | Constraint   | Description                            |
| ----------------- | --------- | ------------ | -------------------------------------- |
| `id`              | UUID      | PK           | ID unik log                            |
| `actor_type`      | ENUM      | NOT NULL     | `patient`, `doctor`, `admin`, `system` |
| `actor_id`        | UUID      | NULLABLE     | ID aktor                               |
| `consultation_id` | UUID      | FK, NULLABLE | Konsultasi yang terkait                |
| `action`          | VARCHAR   | NOT NULL     | Aktivitas                              |
| `description`     | TEXT      | NULLABLE     | Detail aktivitas                       |
| `ip_address`      | VARCHAR   | NULLABLE     | IP address                             |
| `user_agent`      | TEXT      | NULLABLE     | User agent                             |
| `created_at`      | TIMESTAMP | NOT NULL     | Waktu aktivitas                        |

`actor_id` bersifat polymorphic karena dapat mengacu pada pasien, dokter, atau admin sehingga tidak menggunakan satu foreign key langsung.

### Core Audit Actions

```text
PATIENT_LOGIN
DOCTOR_LOGIN
ADMIN_LOGIN

CREATE_CONSULTATION

AI_ANALYSIS_STARTED
AI_ANALYSIS_COMPLETED
AI_ANALYSIS_FAILED

DOCTOR_CLAIM_CONSULTATION
DOCTOR_VIEW_CONSULTATION
DOCTOR_REVIEW_CREATED

CONSULTATION_STATUS_UPDATED

ADMIN_CREATE_DOCTOR
ADMIN_UPDATE_DOCTOR
ADMIN_UPDATE_ACCOUNT_STATUS
ADMIN_VIEW_CONSULTATION
```

---

# 2. Folder Structure

```text
health-nlp-backend/
├── src/
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   ├── env.config.ts
│   │   └── jwt.config.ts
│   │
│   ├── routes/
│   │   ├── index.ts
│   │   ├── auth.routes.ts
│   │   ├── patient.routes.ts
│   │   ├── doctor.routes.ts
│   │   └── admin.routes.ts
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── patientConsultation.controller.ts
│   │   ├── doctorConsultation.controller.ts
│   │   └── admin.controller.ts
│   │
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── consultation.service.ts
│   │   ├── aiAnalysis.service.ts
│   │   ├── doctorReview.service.ts
│   │   ├── admin.service.ts
│   │   └── auditLog.service.ts
│   │
│   ├── repositories/
│   │   ├── patient.repository.ts
│   │   ├── doctor.repository.ts
│   │   ├── admin.repository.ts
│   │   ├── consultation.repository.ts
│   │   ├── aiAnalysis.repository.ts
│   │   ├── doctorReview.repository.ts
│   │   └── auditLog.repository.ts
│   │
│   ├── adapters/
│   │   └── aiModel.adapter.ts
│   │
│   ├── jobs/
│   │   └── aiAnalysis.job.ts
│   │
│   ├── workers/
│   │   └── aiAnalysis.worker.ts
│   │
│   ├── validators/
│   │   ├── auth.validator.ts
│   │   ├── consultation.validator.ts
│   │   ├── doctorReview.validator.ts
│   │   └── admin.validator.ts
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   ├── patientOnly.middleware.ts
│   │   ├── doctorOnly.middleware.ts
│   │   ├── adminOnly.middleware.ts
│   │   ├── validate.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── rateLimit.middleware.ts
│   │   └── auditLog.middleware.ts
│   │
│   ├── constants/
│   │   ├── consultationStatus.ts
│   │   ├── roles.ts
│   │   ├── aiOutputSchema.ts
│   │   └── responseMessage.ts
│   │
│   ├── types/
│   │   ├── auth.type.ts
│   │   ├── consultation.type.ts
│   │   ├── aiAnalysis.type.ts
│   │   ├── admin.type.ts
│   │   └── express.d.ts
│   │
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── pagination.ts
│   │   ├── password.ts
│   │   ├── response.ts
│   │   └── token.ts
│   │
│   ├── app.ts
│   └── server.ts
│
├── database/
│   ├── migrations/
│   └── seeds/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
├── docs/
│   └── openapi.yaml
│
├── .env
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

`jobs/` dan `workers/` digunakan apabila AI inference dijalankan secara asynchronous. Jika MVP sementara masih synchronous, struktur tersebut dapat tetap disiapkan tanpa langsung diimplementasikan.

---

# 3. API Contract

## 3.1 Base URL

```text
/api/v1
```

---

## 3.2 Standard Success Response

```json
{
	"success": true,
	"message": "Request berhasil diproses.",
	"data": {}
}
```

## 3.3 Standard Error Response

```json
{
	"success": false,
	"message": "Request gagal diproses.",
	"errors": []
}
```

### Common HTTP Status

| Status | Usage                                       |
| -----: | ------------------------------------------- |
|  `200` | Request berhasil                            |
|  `201` | Resource berhasil dibuat                    |
|  `400` | Request tidak valid secara umum             |
|  `401` | Authentication gagal                        |
|  `403` | Tidak memiliki permission                   |
|  `404` | Resource tidak ditemukan                    |
|  `409` | Conflict, misalnya email sudah terdaftar    |
|  `422` | Validation error                            |
|  `429` | Terlalu banyak request                      |
|  `500` | Internal server error                       |
|  `503` | AI/runtime/service sementara tidak tersedia |

---

## 3.4 JWT Payload

Payload minimal:

```json
{
	"sub": "actor-uuid",
	"role": "patient"
}
```

`role` dapat berupa:

```text
patient
doctor
admin
```

---

## 3.5 Authentication API

| Method | Endpoint                 | Access        | Description            |
| ------ | ------------------------ | ------------- | ---------------------- |
| `POST` | `/auth/patient/register` | Public        | Registrasi pasien      |
| `POST` | `/auth/patient/login`    | Public        | Login pasien           |
| `POST` | `/auth/doctor/login`     | Public        | Login dokter           |
| `POST` | `/auth/admin/login`      | Public        | Login admin            |
| `GET`  | `/auth/me`               | Authenticated | Mendapatkan akun aktif |

Untuk MVP dengan access-token JWT stateless, logout dapat dilakukan di client dengan menghapus token. Endpoint server-side logout baru diperlukan apabila refresh-token/session revocation diimplementasikan.

---

## 3.6 Patient API

| Method | Endpoint                     | Description                |
| ------ | ---------------------------- | -------------------------- |
| `POST` | `/patient/consultations`     | Membuat konsultasi         |
| `GET`  | `/patient/consultations`     | Melihat riwayat konsultasi |
| `GET`  | `/patient/consultations/:id` | Melihat detail konsultasi  |

Pasien hanya dapat mengakses konsultasi yang memiliki `patient_id` sesuai dengan identitas di token.

---

## 3.7 Doctor API

| Method  | Endpoint                           | Description                                   |
| ------- | ---------------------------------- | --------------------------------------------- |
| `GET`   | `/doctor/consultations`            | Melihat konsultasi tersedia atau milik dokter |
| `GET`   | `/doctor/consultations/:id`        | Melihat detail konsultasi                     |
| `PATCH` | `/doctor/consultations/:id/claim`  | Mengambil konsultasi                          |
| `PATCH` | `/doctor/consultations/:id/review` | Memberikan review                             |
| `PATCH` | `/doctor/consultations/:id/status` | Memperbarui status yang diizinkan             |

Untuk MVP, dokter mengambil konsultasi menggunakan endpoint `claim`. Endpoint ini mengisi `doctor_id`, `assigned_at`, dan mengubah status menjadi `in_review`.

---

## 3.8 Admin API

| Method  | Endpoint                     | Description                |
| ------- | ---------------------------- | -------------------------- |
| `GET`   | `/admin/doctors`             | Daftar dokter              |
| `POST`  | `/admin/doctors`             | Membuat akun dokter        |
| `GET`   | `/admin/doctors/:id`         | Detail dokter              |
| `PATCH` | `/admin/doctors/:id`         | Memperbarui dokter         |
| `PATCH` | `/admin/doctors/:id/status`  | Mengubah status dokter     |
| `GET`   | `/admin/patients`            | Daftar pasien              |
| `GET`   | `/admin/patients/:id`        | Detail pasien              |
| `PATCH` | `/admin/patients/:id/status` | Mengubah status pasien     |
| `GET`   | `/admin/consultations`       | Melihat seluruh konsultasi |
| `GET`   | `/admin/consultations/:id`   | Detail konsultasi          |
| `GET`   | `/admin/audit-logs`          | Melihat audit log          |

Tidak disediakan hard-delete endpoint untuk pasien maupun dokter pada MVP.

---

## 3.9 System API

| Method | Endpoint  | Access          | Description          |
| ------ | --------- | --------------- | -------------------- |
| `GET`  | `/health` | Public/Internal | Health check backend |

Example:

```json
{
	"success": true,
	"message": "Service healthy.",
	"data": {
		"status": "healthy",
		"database": "connected"
	}
}
```

---

## 3.10 API Documentation

Interactive API documentation is available in development and test environments:

```text
Swagger UI : /api-docs
OpenAPI    : /openapi.json
```

Swagger UI supports JWT Bearer authorization for protected operations. The
TypeScript OpenAPI modules are the detailed machine-readable reference; these
routes are disabled by default when `NODE_ENV=production`.

---

# 4. Request and Response Specification

## 4.1 Patient Register

### Endpoint

```http
POST /api/v1/auth/patient/register
```

### Request

```json
{
	"name": "Budi Santoso",
	"email": "budi@mail.com",
	"phone": "08123456789",
	"password": "password123",
	"gender": "male",
	"birth_date": "2001-05-10"
}
```

### Response — `201 Created`

```json
{
	"success": true,
	"message": "Registrasi pasien berhasil.",
	"data": {
		"patient": {
			"id": "patient-uuid",
			"name": "Budi Santoso",
			"email": "budi@mail.com",
			"phone": "08123456789",
			"status": "active"
		}
	}
}
```

### Response — `409 Conflict`

```json
{
	"success": false,
	"message": "Email atau nomor telepon sudah terdaftar.",
	"errors": []
}
```

---

## 4.2 Patient Login

### Endpoint

```http
POST /api/v1/auth/patient/login
```

### Request

```json
{
	"identifier": "08123456789",
	"password": "password123"
}
```

`identifier` dapat berupa email atau nomor telepon.

### Response — `200 OK`

```json
{
	"success": true,
	"message": "Login pasien berhasil.",
	"data": {
		"access_token": "jwt-access-token",
		"token_type": "Bearer",
		"expires_in": 86400,
		"user": {
			"id": "patient-uuid",
			"name": "Budi Santoso",
			"email": "budi@mail.com",
			"phone": "08123456789",
			"role": "patient"
		}
	}
}
```

---

## 4.3 Doctor Login

### Endpoint

```http
POST /api/v1/auth/doctor/login
```

### Request

```json
{
	"email": "doctor@mail.com",
	"password": "password123"
}
```

### Response — `200 OK`

```json
{
	"success": true,
	"message": "Login dokter berhasil.",
	"data": {
		"access_token": "jwt-access-token",
		"token_type": "Bearer",
		"expires_in": 86400,
		"user": {
			"id": "doctor-uuid",
			"name": "dr. Ahmad Pratama",
			"email": "doctor@mail.com",
			"specialization": "Penyakit Dalam",
			"license_number": "SIP-123456",
			"role": "doctor"
		}
	}
}
```

---

## 4.4 Admin Login

### Endpoint

```http
POST /api/v1/auth/admin/login
```

### Request

```json
{
	"email": "admin@mail.com",
	"password": "password123"
}
```

### Response — `200 OK`

```json
{
	"success": true,
	"message": "Login admin berhasil.",
	"data": {
		"access_token": "jwt-access-token",
		"token_type": "Bearer",
		"expires_in": 86400,
		"user": {
			"id": "admin-uuid",
			"name": "Admin Sistem",
			"email": "admin@mail.com",
			"role": "admin"
		}
	}
}
```

---

## 4.5 Authentication Error

Digunakan oleh seluruh endpoint login.

### Response — `401 Unauthorized`

```json
{
	"success": false,
	"message": "Email, nomor telepon, atau password salah.",
	"errors": []
}
```

### Response — `403 Forbidden`

```json
{
	"success": false,
	"message": "Akun tidak aktif.",
	"errors": []
}
```

---

## 4.6 Get Current Account

### Endpoint

```http
GET /api/v1/auth/me
```

### Header

```http
Authorization: Bearer <access_token>
```

### Response — `200 OK`

```json
{
	"success": true,
	"message": "Data akun berhasil diambil.",
	"data": {
		"user": {
			"id": "actor-uuid",
			"name": "Budi Santoso",
			"email": "budi@mail.com",
			"role": "patient"
		}
	}
}
```

---

# 5. Patient Consultation Contract

## 5.1 Create Consultation

### Endpoint

```http
POST /api/v1/patient/consultations
```

### Header

```http
Authorization: Bearer <patient_token>
```

### Request

```json
{
	"complaint_text": "Saya demam, batuk, dan nyeri tenggorokan sejak 3 hari yang lalu."
}
```

### Response — `201 Created`

```json
{
	"success": true,
	"message": "Konsultasi berhasil dianalisis.",
	"data": {
		"consultation": {
			"id": "consultation-uuid",
			"complaint_text": "Saya demam, batuk, dan nyeri tenggorokan sejak 3 hari yang lalu.",
			"status": "analyzed",
			"created_at": "2026-08-11T10:00:00Z"
		},
		"ai_analysis": {
			"summary": "Pasien mengalami keluhan yang memerlukan evaluasi lebih lanjut oleh dokter.",
			"detected_symptoms": ["demam", "batuk"],
			"duration": "3 hari",
			"severity_level": "medium",
			"possible_category": "keluhan pernapasan",
			"urgency_level": "normal",
			"doctor_note_suggestion": "Disarankan melakukan evaluasi klinis lebih lanjut terhadap kondisi pasien.",
			"confidence_score": 0.82,
			"model_version": "dummy-v1"
		}
	}
}
```

`POST` ini sementara menjalankan `DummyAiModelAdapter` secara synchronous untuk
development. Alurnya adalah `submitted -> processing -> analyzed`; output dummy
divalidasi lalu disimpan ke `ai_analyses`. Response `ai_analysis` bersifat
sementara untuk integrasi frontend dan tidak memuat `raw_output` atau
`processing_time_ms`. Output ini merupakan pre-screening/decision support, bukan
diagnosis medis final. Model AI sebenarnya masih ditunda.

---

## 5.2 Get Patient Consultations

### Endpoint

```http
GET /api/v1/patient/consultations
```

### Query Parameters

| Parameter | Required | Description   |
| --------- | -------- | ------------- |
| `status`  | No       | Filter status |
| `page`    | No       | Halaman       |
| `limit`   | No       | Jumlah data   |

### Response — `200 OK`

```json
{
	"success": true,
	"message": "Riwayat konsultasi berhasil diambil.",
	"data": {
		"items": [
			{
				"id": "consultation-uuid",
				"complaint_text": "Saya demam, batuk, dan nyeri tenggorokan...",
				"status": "reviewed",
				"created_at": "2026-08-11T10:00:00Z",
				"category": "keluhan pernapasan",
				"confidence_score": 0.82
			}
		],
		"pagination": {
			"page": 1,
			"limit": 10,
			"total": 12,
			"total_pages": 2
		},
		"statistics": {
			"this_month": 4,
			"best_confidence": 0.87,
			"top_diagnosis": "keluhan pernapasan",
			"distribution": {
				"keluhan pernapasan": 3,
				"keluhan pencernaan": 1
			}
		}
	}
}
```

`complaint_text` pada daftar merupakan representasi ringan: teks penuh sampai 100 karakter, atau 100 karakter pertama ditambah `...`.

`category` berasal hanya dari `DoctorReview.finalCategory`, sedangkan `confidence_score` berasal dari `AiAnalysis.confidenceScore`. Keduanya hanya ditampilkan untuk status `reviewed` atau `closed`; prediksi kategori AI yang belum dikonfirmasi tidak dikirim kepada pasien. Endpoint ini tidak mengirim object `AiAnalysis` atau field AI sensitif lainnya.

Statistik selalu dihitung untuk seluruh riwayat pasien terautentikasi dan tidak dipengaruhi pagination maupun filter status tabel. `this_month` menghitung konsultasi pada bulan kalender UTC saat ini. `best_confidence` menggunakan confidence tertinggi dari konsultasi `reviewed`/`closed`. `top_diagnosis` dan `distribution` menggunakan kategori final dokter; apabila jumlah teratas sama, kategori dengan urutan alfabetis lebih dahulu dipilih.

---

## 5.3 Get Patient Consultation Detail

### Endpoint

```http
GET /api/v1/patient/consultations/:id
```

### Response — `200 OK`

```json
{
	"success": true,
	"message": "Detail konsultasi berhasil diambil.",
	"data": {
		"consultation": {
			"id": "consultation-uuid",
			"complaint_text": "Saya demam, batuk, dan nyeri tenggorokan sejak 3 hari yang lalu.",
			"status": "reviewed",
			"created_at": "2026-08-11T10:00:00Z",
			"updated_at": "2026-08-11T11:00:00Z"
		},
		"doctor_review": null
	}
}
```

Hasil `ai_analysis` tidak dikirim kepada pasien karena AI digunakan sebagai decision-support/pre-screening untuk dokter.

Pada kontrak Patient Consultation yang saat ini diimplementasikan,
`doctor_review` bernilai `null`.

### Response — `404 Not Found`

```json
{
	"success": false,
	"message": "Konsultasi tidak ditemukan.",
	"errors": []
}
```

Response yang sama digunakan apabila konsultasi tidak ada atau dimiliki pasien lain agar keberadaan resource tidak dapat dienumerasi.

---

# 6. Doctor Consultation Contract

## 6.1 Get Doctor Consultations

### Endpoint

```http
GET /api/v1/doctor/consultations
```

### Query Parameters

| Parameter         | Description                                      |
| ----------------- | ------------------------------------------------ |
| `scope=available` | Konsultasi `analyzed` yang belum memiliki dokter |
| `scope=mine`      | Konsultasi yang sedang/sempat ditangani dokter   |
| `status`          | Filter status                                    |
| `urgency_level`   | Filter urgensi                                   |
| `page`            | Halaman                                          |
| `limit`           | Jumlah data                                      |

### Response — `200 OK`

```json
{
	"success": true,
	"message": "Daftar konsultasi berhasil diambil.",
	"data": {
		"items": [
			{
				"id": "consultation-uuid",
				"patient": {
					"id": "patient-uuid",
					"name": "Budi Santoso",
					"gender": "male",
					"birth_date": "2001-05-10"
				},
				"complaint_preview": "Saya demam, batuk, dan nyeri tenggorokan...",
				"status": "analyzed",
				"ai_analysis": {
					"possible_category": "keluhan pernapasan",
					"severity_level": "medium",
					"urgency_level": "normal",
					"confidence_score": 0.82
				},
				"created_at": "2026-08-11T10:00:00Z"
			}
		],
		"pagination": {
			"page": 1,
			"limit": 10,
			"total": 1,
			"total_pages": 1
		}
	}
}
```

---

## 6.2 Get Doctor Consultation Detail

### Endpoint

```http
GET /api/v1/doctor/consultations/:id
```

### Response — `200 OK`

```json
{
	"success": true,
	"message": "Detail konsultasi berhasil diambil.",
	"data": {
		"consultation": {
			"id": "consultation-uuid",
			"complaint_text": "Saya demam, batuk, dan nyeri tenggorokan sejak 3 hari yang lalu.",
			"status": "analyzed",
			"created_at": "2026-08-11T10:00:00Z"
		},
		"patient": {
			"id": "patient-uuid",
			"name": "Budi Santoso",
			"gender": "male",
			"birth_date": "2001-05-10"
		},
		"ai_analysis": {
			"summary": "Pasien mengeluhkan demam, batuk, dan nyeri tenggorokan selama tiga hari.",
			"detected_symptoms": ["demam", "batuk", "nyeri tenggorokan"],
			"duration": "3 hari",
			"severity_level": "medium",
			"possible_category": "keluhan pernapasan",
			"urgency_level": "normal",
			"doctor_note_suggestion": "Perlu konfirmasi suhu tubuh dan apakah terdapat sesak napas.",
			"confidence_score": 0.82,
			"model_version": "model-v1"
		}
	}
}
```

---

## 6.3 Claim Consultation

### Endpoint

```http
PATCH /api/v1/doctor/consultations/:id/claim
```

Tidak membutuhkan request body.

### Requirement

Konsultasi harus:

```text
status = analyzed
doctor_id = null
```

### Response — `200 OK`

```json
{
	"success": true,
	"message": "Konsultasi berhasil diambil.",
	"data": {
		"consultation": {
			"id": "consultation-uuid",
			"doctor_id": "doctor-uuid",
			"status": "in_review",
			"assigned_at": "2026-08-11T10:30:00Z"
		}
	}
}
```

### Response — `409 Conflict`

```json
{
	"success": false,
	"message": "Konsultasi sudah diambil oleh dokter lain.",
	"errors": []
}
```

---

## 6.4 Create Doctor Review

### Endpoint

```http
PATCH /api/v1/doctor/consultations/:id/review
```

### Request

```json
{
	"review_note": "Keluhan pasien masih tergolong ringan tetapi perlu dipantau.",
	"final_category": "keluhan pernapasan",
	"final_urgency_level": "normal",
	"recommendation": "Istirahat dan lakukan pemeriksaan langsung apabila muncul sesak napas."
}
```

### Requirement

```text
consultation.doctor_id = current_doctor.id
consultation.status = in_review
```

### Response — `200 OK`

```json
{
	"success": true,
	"message": "Review dokter berhasil disimpan.",
	"data": {
		"review": {
			"id": "review-uuid",
			"consultation_id": "consultation-uuid",
			"doctor_id": "doctor-uuid",
			"review_note": "Keluhan pasien masih tergolong ringan tetapi perlu dipantau.",
			"final_category": "keluhan pernapasan",
			"final_urgency_level": "normal",
			"recommendation": "Istirahat dan lakukan pemeriksaan langsung apabila muncul sesak napas.",
			"created_at": "2026-08-11T11:00:00Z"
		},
		"consultation_status": "reviewed"
	}
}
```

---

## 6.5 Close Consultation

### Endpoint

```http
PATCH /api/v1/doctor/consultations/:id/status
```

### Request

```json
{
	"status": "closed"
}
```

Untuk MVP, dokter hanya diperbolehkan melakukan perubahan:

```text
reviewed → closed
```

State transition internal lain dilakukan oleh backend, bukan melalui endpoint ini.

---

# 7. Admin Contract

## 7.1 Create Doctor

### Endpoint

```http
POST /api/v1/admin/doctors
```

### Request

```json
{
	"name": "dr. Ahmad Pratama",
	"email": "doctor@mail.com",
	"password": "password123",
	"specialization": "Penyakit Dalam",
	"license_number": "SIP-123456"
}
```

### Response — `201 Created`

```json
{
	"success": true,
	"message": "Data dokter berhasil ditambahkan.",
	"data": {
		"doctor": {
			"id": "doctor-uuid",
			"name": "dr. Ahmad Pratama",
			"email": "doctor@mail.com",
			"specialization": "Penyakit Dalam",
			"license_number": "SIP-123456",
			"status": "active"
		}
	}
}
```

---

## 7.2 Update Doctor

### Endpoint

```http
PATCH /api/v1/admin/doctors/:id
```

### Request

```json
{
	"name": "dr. Ahmad Pratama",
	"specialization": "Pulmonologi"
}
```

Hanya field yang diberikan yang diperbarui.

---

## 7.3 Update Doctor Status

### Endpoint

```http
PATCH /api/v1/admin/doctors/:id/status
```

### Request

```json
{
	"status": "inactive"
}
```

---

## 7.4 Update Patient Status

### Endpoint

```http
PATCH /api/v1/admin/patients/:id/status
```

### Request

```json
{
	"status": "inactive"
}
```

---

## 7.5 Get Admin Consultations

### Endpoint

```http
GET /api/v1/admin/consultations
```

### Query Parameters

| Parameter       | Description       |
| --------------- | ----------------- |
| `status`        | Status konsultasi |
| `urgency_level` | Urgensi AI        |
| `doctor_id`     | Filter dokter     |
| `patient_id`    | Filter pasien     |
| `page`          | Halaman           |
| `limit`         | Jumlah data       |

Admin dapat melihat metadata konsultasi dan hasil analisis untuk kebutuhan monitoring sistem.

---

## 7.6 Get Audit Logs

### Endpoint

```http
GET /api/v1/admin/audit-logs
```

### Query Parameters

| Parameter         | Description                            |
| ----------------- | -------------------------------------- |
| `actor_type`      | `patient`, `doctor`, `admin`, `system` |
| `action`          | Filter action                          |
| `consultation_id` | Filter konsultasi                      |
| `page`            | Halaman                                |
| `limit`           | Jumlah data                            |

### Response — `200 OK`

```json
{
	"success": true,
	"message": "Audit log berhasil diambil.",
	"data": {
		"items": [
			{
				"id": "audit-uuid",
				"actor_type": "doctor",
				"actor_id": "doctor-uuid",
				"consultation_id": "consultation-uuid",
				"action": "DOCTOR_VIEW_CONSULTATION",
				"created_at": "2026-08-11T10:40:00Z"
			}
		],
		"pagination": {
			"page": 1,
			"limit": 20,
			"total": 1,
			"total_pages": 1
		}
	}
}
```

---

# 8. AI Model Output Contract

AI model harus menghasilkan structured output yang dapat divalidasi backend.

```json
{
	"summary": "Pasien mengeluhkan demam, batuk, dan nyeri tenggorokan selama tiga hari.",
	"detected_symptoms": ["demam", "batuk", "nyeri tenggorokan"],
	"duration": "3 hari",
	"severity_level": "medium",
	"possible_category": "keluhan pernapasan",
	"urgency_level": "normal",
	"doctor_note_suggestion": "Perlu konfirmasi suhu tubuh dan apakah terdapat sesak napas.",
	"confidence_score": 0.82,
	"model_version": "model-v1"
}
```

## Field Contract

| Field                    | Type     | Required | Description                    |
| ------------------------ | -------- | -------- | ------------------------------ |
| `summary`                | string   | Yes      | Ringkasan keluhan              |
| `detected_symptoms`      | string[] | Yes      | Gejala terdeteksi              |
| `duration`               | string   | No       | Durasi keluhan                 |
| `severity_level`         | string   | Yes      | `low`, `medium`, `high`        |
| `possible_category`      | string   | Yes      | Kategori keluhan               |
| `urgency_level`          | string   | Yes      | `normal`, `priority`, `urgent` |
| `doctor_note_suggestion` | string   | No       | Catatan awal untuk dokter      |
| `confidence_score`       | number   | Yes      | Rentang `0.0–1.0`              |
| `model_version`          | string   | Yes      | Versi model                    |

Backend wajib memvalidasi AI output sebelum menyimpannya.

Jika output tidak valid:

```text
consultation.status = failed
```

dan backend mencatat:

```text
AI_ANALYSIS_FAILED
```

ke system log serta audit log.

---

# 9. AI Processing Flow

Implementasi development saat ini menggunakan `DummyAiModelAdapter` yang
deterministik dan tidak memanggil service eksternal. Adapter dipanggil secara
synchronous dari flow pembuatan consultation, tetapi tetap berada di balik
interface `AiModelAdapter` agar model sebenarnya dapat menggantikannya tanpa
mengubah processing, validasi, persistence, atau controller.

Recommended flow:

```text
Patient submits complaint
        │
        ▼
consultation = submitted
        │
        ▼
Synchronous dummy processing invoked
        │
        ▼
consultation = processing
        │
        ▼
AI Model Runtime
        │
        ├──────────── failure ────────────┐
        │                                │
        ▼                                ▼
Validate AI output                 consultation = failed
        │
        ▼
Save ai_analyses
        │
        ▼
consultation = analyzed
        │
        ▼
Available for doctor
```

Untuk dummy integration, API menunggu processing selesai. Strategi asynchronous
dapat dipertimbangkan nanti ketika transport dan karakteristik runtime model
sebenarnya sudah tersedia; Phase 5 ini tidak menambahkan queue atau worker.

---

# 10. Validation Baseline

## Patient Registration

```text
name            required
email           required, valid email
phone           required
password        required, minimum 8 characters
gender          optional
birth_date      optional, valid date
```

## Consultation

```text
complaint_text
- required
- string
- tidak boleh kosong
- minimum length ditentukan saat implementasi
- maximum length ditentukan sesuai kemampuan model
```

## Doctor Review

```text
review_note                 required
final_category              optional
final_urgency_level         optional
recommendation              optional
```

## AI Output

```text
confidence_score = 0.0 sampai 1.0

severity_level:
- low
- medium
- high

urgency_level:
- normal
- priority
- urgent
```

---

# 11. Security Baseline

Minimum security requirement untuk MVP:

- Password disimpan menggunakan secure password hashing.
- JWT secret hanya disimpan melalui environment variable.
- Semua endpoint selain authentication dan health check menggunakan authentication middleware.
- Role diverifikasi melalui dedicated middleware.
- Pasien hanya dapat mengakses konsultasi miliknya.
- Dokter hanya dapat melakukan review terhadap konsultasi yang sudah di-claim olehnya.
- Admin endpoint hanya dapat diakses admin.
- Input request wajib divalidasi.
- AI output wajib divalidasi sebelum disimpan.
- Rate limiting diterapkan terutama pada endpoint authentication dan consultation creation.
- Error internal dan stack trace tidak dikirim ke client.
- Aktivitas penting dicatat ke audit log.
- Data kesehatan tidak dimasukkan secara utuh ke application log umum.
- Secret dan credential tidak disimpan di repository.
- CORS dibatasi sesuai frontend origin pada environment production.

---

# 12. Environment Variables

Contoh `.env.example`:

```env
NODE_ENV=development
PORT=3000

DATABASE_URL=

JWT_SECRET=
JWT_EXPIRES_IN=24h

CORS_ORIGIN=http://localhost:3000

LOG_LEVEL=info

AI_MODEL_MODE=
AI_MODEL_TARGET=
AI_MODEL_TIMEOUT_MS=
```

Nama environment untuk AI dapat disesuaikan setelah mekanisme integrasi model sudah ditentukan.

---

# 13. Backend Roadmap

## Phase 1 — Project Foundation

### Tasks

- Initialize Express.js + TypeScript.
- Setup linting dan formatting.
- Setup environment configuration.
- Setup folder structure.
- Setup database connection.
- Setup response helper.
- Setup logger.
- Setup global error handler.
- Implement `/health`.

### Deliverables

- Backend server berjalan.
- Environment terkonfigurasi.
- Database terkoneksi.
- Health check tersedia.

---

## Phase 2 — Database Schema and Migration

### Tasks

- Implement `patients`.
- Implement `doctors`.
- Implement `admins`.
- Implement `consultations`.
- Implement `ai_analyses`.
- Implement `doctor_reviews`.
- Implement `audit_logs`.
- Add index dan unique constraint.
- Create initial admin seed.

### Deliverables

- Schema database tersedia.
- Migration dapat dijalankan.
- Initial admin dapat dibuat melalui seed.

---

## Phase 3 — Authentication and Authorization

### Tasks

- Patient registration.
- Patient login.
- Doctor login.
- Admin login.
- Password hashing.
- JWT generation.
- Authentication middleware.
- Patient-only middleware.
- Doctor-only middleware.
- Admin-only middleware.
- `/auth/me`.

### Deliverables

- Semua aktor dapat login.
- Protected endpoint dapat memverifikasi role.

---

## Phase 4 — Patient Consultation

### Tasks

- Create consultation.
- Get patient consultation list.
- Get patient consultation detail.
- Implement ownership validation.
- Implement consultation status.
- Implement consultation input validation.

### Deliverables

- Pasien dapat membuat konsultasi.
- Pasien hanya dapat membaca konsultasinya sendiri.

---

## Phase 5 — Dummy AI Integration

Status: complete untuk integrasi dummy development. Transport model internal
yang sebenarnya belum ditentukan dan tidak ditebak pada fase ini.

### Tasks

- Implement `aiModel.adapter.ts`.
- Implement AI output validator.
- Implement AI processing service.
- Jalankan dummy processing secara synchronous dari Patient POST.
- Save AI analysis.
- Save model version.
- Record processing time.
- Handle AI failure.
- Implement AI audit events.

`DummyAiModelAdapter` saat ini aktif dan menghasilkan output tetap `dummy-v1`.
Penggantian ke adapter model sebenarnya merupakan pekerjaan integrasi mendatang.

### Deliverables

- Keluhan dapat diproses AI.
- AI output tervalidasi.
- AI analysis tersimpan.
- Failed inference dapat ditangani.

---

## Phase 6 — Doctor Consultation and Review

### Tasks

- Get available consultations.
- Get doctor's own consultations.
- Get consultation detail.
- Claim consultation.
- Prevent double claim.
- Create doctor review.
- Update reviewed status.
- Close consultation.
- Add doctor audit events.

### Deliverables

- Dokter dapat mengambil konsultasi.
- Dokter dapat melihat hasil AI.
- Dokter dapat memberikan review.

---

## Phase 7 — Admin Management

### Tasks

- Get doctor list.
- Create doctor.
- Get doctor detail.
- Update doctor.
- Update doctor status.
- Get patient list.
- Get patient detail.
- Update patient status.
- Get consultation list.
- Get consultation detail.
- Get audit logs.

### Deliverables

- Admin dapat mengelola akun dokter.
- Admin dapat memonitor pasien dan konsultasi.
- Admin dapat melihat audit trail.

---

## Phase 8 — Security and Validation Hardening

### Tasks

- Rate limiting.
- Request validation review.
- Authorization review.
- Sensitive log review.
- CORS hardening.
- Production error handler.
- Audit log review.
- Security-focused integration tests.

### Deliverables

- Security baseline terpenuhi.
- Sensitive data tidak terekspos melalui response/log umum.

---

## Phase 9 — Testing and Documentation

### Unit Tests

- Auth service.
- Consultation service.
- Doctor review service.
- AI output validator.
- AI adapter mock.

### Integration Tests

- Patient register/login.
- Doctor login.
- Admin login.
- Consultation ownership.
- Consultation creation.
- Doctor claim conflict.
- Doctor review permission.
- Admin authorization.
- AI failure flow.

### Documentation

- OpenAPI/Swagger.
- Postman collection.
- README.
- Environment setup documentation.

### Deliverables

- Core flow memiliki automated tests.
- API documentation tersedia.

---

## Phase 10 — Deployment Preparation

### Tasks

- Production environment configuration.
- Dockerfile.
- Migration deployment strategy.
- Production logging.
- Secret management.
- CORS production configuration.
- Health check.
- Graceful shutdown.
- Database backup strategy.
- Deployment documentation.

### Deliverables

- Backend production-ready.
- Deployment procedure terdokumentasi.

---

# 14. MVP Development Priority

| Priority | Module                         |
| -------: | ------------------------------ |
|        1 | Project foundation             |
|        2 | Database schema                |
|        3 | Authentication & authorization |
|        4 | Patient consultation           |
|        5 | AI integration                 |
|        6 | Doctor consultation & review   |
|        7 | Admin management               |
|        8 | Security & audit log           |
|        9 | Testing & documentation        |
|       10 | Deployment                     |

Core MVP flow:

```text
Patient Login
      │
      ▼
Submit Complaint
      │
      ▼
AI Processing
      │
      ▼
AI Pre-Screening Result
      │
      ▼
Doctor Claims Consultation
      │
      ▼
Doctor Reviews Result
      │
      ▼
Patient Receives Doctor Review
      │
      ▼
Consultation Closed
```

---

# 15. Pre-Development Checklist

Sebelum development dimulai, pastikan keputusan berikut sudah tersedia.

## Required Before Phase 1–2

- [ ] Database sudah ditentukan.
- [ ] ORM/query builder sudah ditentukan.
- [ ] Naming convention database disepakati.
- [ ] UUID strategy disepakati.

## Required Before Phase 5

- [ ] Interface AI model sudah diketahui.
- [ ] AI model input contract sudah fixed.
- [ ] AI model output contract sudah disepakati.
- [ ] Cara menjalankan inference sudah diketahui.
- [ ] Sync/async processing sudah diputuskan.
- [ ] Timeout/error behavior model sudah diketahui.

## Required Before Phase 6

- [x] Doctor assignment MVP menggunakan self-claim.
- [ ] Aturan dokter mana yang dapat melihat konsultasi tersedia dikonfirmasi.
- [ ] Aturan specialization matching jika diperlukan dikonfirmasi.

## Required Before Production

- [ ] Deployment target tersedia.
- [ ] Data retention policy tersedia.
- [ ] Backup policy tersedia.
- [ ] Production secret management tersedia.
- [ ] Production logging policy tersedia.

---

# 16. Definition of MVP Complete

Backend MVP dianggap selesai apabila:

- Pasien dapat registrasi dan login.
- Dokter dapat login.
- Admin dapat login.
- Pasien dapat mengirim keluhan.
- Keluhan berhasil diproses AI model internal.
- AI output tervalidasi sebelum masuk database.
- Dokter dapat melihat hasil AI.
- Dokter dapat mengambil konsultasi tanpa konflik dengan dokter lain.
- Dokter dapat memberikan review.
- Pasien dapat melihat hasil review dokter.
- Admin dapat mengelola akun dokter.
- Admin dapat memonitor konsultasi.
- Role dan ownership authorization berjalan.
- Audit log untuk aktivitas penting tersedia.
- Core flow memiliki automated tests.
- API terdokumentasi.
- Backend dapat dijalankan pada target deployment.
