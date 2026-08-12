import { describe, expect, mock, test } from "bun:test";

import {
	AccountStatus,
	ActorType,
	ConsultationStatus,
	SeverityLevel,
	UrgencyLevel,
} from "../src/generated/prisma/enums";
import type {
	AdminAuditLogRecord,
	AdminConsultationDetailRecord,
	AdminConsultationListRecord,
	AdminDoctorRecord,
	AdminManagementRepository,
	AdminPatientRecord,
} from "../src/repositories/adminManagement.repository";
import { AdminService } from "../src/services/admin.service";

const adminId = "061af019-5542-49f6-978a-78b819c6be3a";
const doctorId = "061af019-5542-49f6-978a-78b819c6be3b";
const patientId = "061af019-5542-49f6-978a-78b819c6be3c";
const consultationId = "061af019-5542-49f6-978a-78b819c6be3d";
const createdAt = new Date("2026-08-12T03:00:00.000Z");
const updatedAt = new Date("2026-08-12T04:00:00.000Z");
const decimal = { toNumber: () => 0.82 };

const doctor: AdminDoctorRecord = {
	id: doctorId,
	name: "dr. Test",
	email: "doctor@mail.com",
	specialization: "Pulmonologi",
	licenseNumber: "SIP-123",
	status: AccountStatus.ACTIVE,
	createdAt,
	updatedAt,
};

const patient: AdminPatientRecord = {
	id: patientId,
	name: "Pasien Test",
	email: "patient@mail.com",
	phone: "08123456789",
	gender: "male",
	birthDate: new Date("2001-05-10T00:00:00.000Z"),
	status: AccountStatus.ACTIVE,
	createdAt,
	updatedAt,
};

const consultation: AdminConsultationListRecord = {
	id: consultationId,
	status: ConsultationStatus.REVIEWED,
	createdAt,
	assignedAt: createdAt,
	reviewedAt: updatedAt,
	closedAt: null,
	patient: { id: patientId, name: patient.name, email: patient.email },
	doctor: { id: doctorId, name: doctor.name, email: doctor.email },
	aiAnalysis: {
		possibleCategory: "keluhan pernapasan",
		urgencyLevel: UrgencyLevel.NORMAL,
		confidenceScore: decimal,
	},
};

const detail: AdminConsultationDetailRecord = {
	id: consultationId,
	complaintText: "Keluhan kesehatan lengkap yang hanya terlihat pada detail.",
	status: ConsultationStatus.REVIEWED,
	assignedAt: createdAt,
	reviewedAt: updatedAt,
	closedAt: null,
	createdAt,
	updatedAt,
	patient,
	doctor,
	aiAnalysis: {
		summary: "Ringkasan untuk monitoring.",
		detectedSymptoms: ["demam", 1],
		duration: "3 hari",
		severityLevel: SeverityLevel.MEDIUM,
		possibleCategory: "keluhan pernapasan",
		urgencyLevel: UrgencyLevel.NORMAL,
		doctorNoteSuggestion: "Evaluasi klinis.",
		confidenceScore: decimal,
		modelVersion: "dummy-v1",
		createdAt,
	},
	review: {
		id: "061af019-5542-49f6-978a-78b819c6be3e",
		reviewNote: "Catatan internal dokter.",
		finalCategory: "keluhan pernapasan",
		finalUrgencyLevel: UrgencyLevel.NORMAL,
		recommendation: "Pantau gejala.",
		createdAt,
		updatedAt,
	},
};

const auditLog: AdminAuditLogRecord = {
	id: "061af019-5542-49f6-978a-78b819c6be3f",
	actorType: ActorType.ADMIN,
	actorId: adminId,
	consultationId,
	action: "ADMIN_VIEW_CONSULTATION",
	description: "Admin melihat detail konsultasi.",
	ipAddress: null,
	userAgent: null,
	createdAt,
};

function repository(
	overrides: Partial<AdminManagementRepository> = {},
): AdminManagementRepository {
	return {
		findManyDoctors: async () => [],
		countDoctors: async () => 0,
		findDoctorById: async () => null,
		createDoctor: async () => doctor,
		updateDoctor: async () => null,
		updateDoctorStatus: async () => null,
		findManyPatients: async () => [],
		countPatients: async () => 0,
		findPatientById: async () => null,
		updatePatientStatus: async () => null,
		findManyConsultations: async () => [],
		countConsultations: async () => 0,
		findConsultationDetail: async () => null,
		findManyAuditLogs: async () => [],
		countAuditLogs: async () => 0,
		...overrides,
	} as AdminManagementRepository;
}

describe("AdminService Doctor management", () => {
	test("lists Doctors using filters, pagination, and safe mapping", async () => {
		const findManyDoctors = mock(async () => [doctor]);
		const countDoctors = mock(async () => 11);
		const service = new AdminService({ repository: repository({ findManyDoctors, countDoctors }), hashPassword: async () => "hash" });
		const result = await service.listDoctors({ status: AccountStatus.ACTIVE, search: "pulmo", page: 2, limit: 5 });

		expect(findManyDoctors).toHaveBeenCalledWith({ status: AccountStatus.ACTIVE, search: "pulmo", skip: 5, take: 5 });
		expect(result.pagination).toEqual({ page: 2, limit: 5, total: 11, total_pages: 3 });
		expect(result.items[0]).toMatchObject({ license_number: "SIP-123", status: "active" });
		expect(JSON.stringify(result)).not.toContain("passwordHash");
	});

	test("creates an ACTIVE Doctor with a password hash and no returned password", async () => {
		const hashPassword = mock(async () => "bcrypt-hash");
		const createDoctor = mock(async () => doctor);
		const service = new AdminService({ repository: repository({ createDoctor }), hashPassword });
		const result = await service.createDoctor(adminId, {
			name: doctor.name,
			email: doctor.email,
			password: "password123",
			specialization: doctor.specialization,
			license_number: doctor.licenseNumber,
		});

		expect(hashPassword).toHaveBeenCalledWith("password123");
		expect(createDoctor).toHaveBeenCalledWith(adminId, expect.objectContaining({ passwordHash: "bcrypt-hash" }));
		expect(result.doctor.status).toBe("active");
		expect(JSON.stringify(result)).not.toContain("bcrypt-hash");
	});

	test("maps duplicate create and update constraints to 409", async () => {
		const duplicate = Object.assign(new Error("duplicate"), { code: "P2002" });
		const service = new AdminService({
			repository: repository({ createDoctor: async () => { throw duplicate; }, updateDoctor: async () => { throw duplicate; } }),
			hashPassword: async () => "hash",
		});
		await expect(service.createDoctor(adminId, { name: "D", email: "d@mail.com", password: "password123", license_number: "SIP" })).rejects.toMatchObject({ statusCode: 409 });
		await expect(service.updateDoctor(adminId, doctorId, { email: "d@mail.com" })).rejects.toMatchObject({ statusCode: 409 });
	});

	test("gets, updates, and changes status without exposing credentials", async () => {
		const updateDoctor = mock(async () => ({ ...doctor, specialization: null }));
		const updateDoctorStatus = mock(async () => ({ ...doctor, status: AccountStatus.INACTIVE }));
		const service = new AdminService({ repository: repository({ findDoctorById: async () => doctor, updateDoctor, updateDoctorStatus }), hashPassword: async () => "hash" });
		expect((await service.getDoctor(doctorId)).doctor.id).toBe(doctorId);
		expect((await service.updateDoctor(adminId, doctorId, { specialization: null })).doctor.specialization).toBeNull();
		expect((await service.updateDoctorStatus(adminId, doctorId, { status: AccountStatus.INACTIVE })).doctor.status).toBe("inactive");
		expect(updateDoctorStatus).toHaveBeenCalledWith(doctorId, adminId, AccountStatus.INACTIVE);
	});

	test("returns 404 for missing Doctor records", async () => {
		const service = new AdminService({ repository: repository(), hashPassword: async () => "hash" });
		await expect(service.getDoctor(doctorId)).rejects.toMatchObject({ statusCode: 404 });
		await expect(service.updateDoctor(adminId, doctorId, { name: "Doctor" })).rejects.toMatchObject({ statusCode: 404 });
	});
});

describe("AdminService Patient management", () => {
	test("lists, reads, and changes Patient status safely", async () => {
		const findManyPatients = mock(async () => [patient]);
		const updatePatientStatus = mock(async () => ({ ...patient, status: AccountStatus.INACTIVE }));
		const service = new AdminService({ repository: repository({ findManyPatients, countPatients: async () => 1, findPatientById: async () => patient, updatePatientStatus }), hashPassword: async () => "hash" });
		const list = await service.listPatients({ search: "pasien", page: 1, limit: 10 });
		expect(findManyPatients).toHaveBeenCalledWith({ search: "pasien", skip: 0, take: 10 });
		expect(list.items[0]?.birth_date).toBe("2001-05-10");
		expect((await service.getPatient(patientId)).patient).not.toHaveProperty("consultations");
		expect((await service.updatePatientStatus(adminId, patientId, { status: AccountStatus.INACTIVE })).patient.status).toBe("inactive");
		expect(JSON.stringify(list)).not.toContain("passwordHash");
	});

	test("returns 404 for missing Patient records", async () => {
		const service = new AdminService({ repository: repository(), hashPassword: async () => "hash" });
		await expect(service.getPatient(patientId)).rejects.toMatchObject({ statusCode: 404 });
		await expect(service.updatePatientStatus(adminId, patientId, { status: AccountStatus.ACTIVE })).rejects.toMatchObject({ statusCode: 404 });
	});
});

describe("AdminService monitoring and audit logs", () => {
	test("applies all consultation filters and maps lightweight safe rows", async () => {
		const findManyConsultations = mock(async () => [consultation]);
		const service = new AdminService({ repository: repository({ findManyConsultations, countConsultations: async () => 1 }), hashPassword: async () => "hash" });
		const result = await service.listConsultations({ status: ConsultationStatus.REVIEWED, patient_id: patientId, doctor_id: doctorId, urgency_level: UrgencyLevel.NORMAL, page: 1, limit: 10 });
		expect(findManyConsultations).toHaveBeenCalledWith({ status: ConsultationStatus.REVIEWED, patientId, doctorId, urgencyLevel: UrgencyLevel.NORMAL, skip: 0, take: 10 });
		expect(result.items[0]).toMatchObject({ ai_possible_category: "keluhan pernapasan", ai_urgency_level: "normal", ai_confidence_score: 0.82 });
		expect(JSON.stringify(result)).not.toContain("complaint");
		expect(JSON.stringify(result)).not.toContain("rawOutput");
	});

	test("returns full authorized detail with safe AI and review data", async () => {
		const findConsultationDetail = mock(async () => detail);
		const service = new AdminService({ repository: repository({ findConsultationDetail }), hashPassword: async () => "hash" });
		const result = await service.getConsultation(consultationId, adminId);
		expect(findConsultationDetail).toHaveBeenCalledWith(consultationId, adminId);
		expect(result.ai_analysis).toMatchObject({ detected_symptoms: ["demam"], confidence_score: 0.82, model_version: "dummy-v1" });
		expect(result.doctor_review?.review_note).toBe("Catatan internal dokter.");
		expect(JSON.stringify(result)).not.toContain("rawOutput");
		expect(JSON.stringify(result)).not.toContain("processingTimeMs");
		expect(JSON.stringify(result)).not.toContain("passwordHash");
	});

	test("returns 404 for a missing consultation", async () => {
		const service = new AdminService({ repository: repository(), hashPassword: async () => "hash" });
		await expect(service.getConsultation(consultationId, adminId)).rejects.toMatchObject({ statusCode: 404 });
	});

	test("filters and paginates audit logs newest-first at repository boundary", async () => {
		const findManyAuditLogs = mock(async () => [auditLog]);
		const service = new AdminService({ repository: repository({ findManyAuditLogs, countAuditLogs: async () => 21 }), hashPassword: async () => "hash" });
		const result = await service.listAuditLogs({ actor_type: ActorType.ADMIN, actor_id: adminId, consultation_id: consultationId, action: "ADMIN_VIEW_CONSULTATION", page: 2, limit: 10 });
		expect(findManyAuditLogs).toHaveBeenCalledWith({ actorType: ActorType.ADMIN, actorId: adminId, consultationId, action: "ADMIN_VIEW_CONSULTATION", skip: 10, take: 10 });
		expect(result.items[0]).toMatchObject({ actor_type: "admin", action: "ADMIN_VIEW_CONSULTATION" });
		expect(result.pagination.total_pages).toBe(3);
	});
});
