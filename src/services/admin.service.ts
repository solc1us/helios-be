import {
	adminManagementRepository,
	type AdminAiAnalysisRecord,
	type AdminConsultationDetailRecord,
	type AdminConsultationListRecord,
	type AdminDoctorRecord,
	type AdminDoctorReviewRecord,
	type AdminManagementRepository,
	type AdminPatientRecord,
} from "../repositories/adminManagement.repository";
import type {
	AdminAccountListQuery,
	AdminAuditLogListQuery,
	AdminConsultationListQuery,
	CreateDoctorInput,
	UpdateAccountStatusInput,
	UpdateDoctorInput,
} from "../types/admin.type";
import { AppError } from "../utils/app-error";
import { hashPassword } from "../utils/password";

interface AdminServiceDependencies {
	repository: AdminManagementRepository;
	hashPassword: (password: string) => Promise<string>;
}

const defaultDependencies: AdminServiceDependencies = {
	repository: adminManagementRepository,
	hashPassword,
};

function apiEnum(value: string): string {
	return value.toLowerCase();
}

function isUniqueConstraintError(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		error.code === "P2002"
	);
}

function pagination(page: number, limit: number, total: number) {
	return {
		page,
		limit,
		total,
		total_pages: Math.ceil(total / limit),
	};
}

function mapDoctor(doctor: AdminDoctorRecord) {
	return {
		id: doctor.id,
		name: doctor.name,
		email: doctor.email,
		specialization: doctor.specialization,
		license_number: doctor.licenseNumber,
		status: apiEnum(doctor.status),
		created_at: doctor.createdAt.toISOString(),
		updated_at: doctor.updatedAt.toISOString(),
	};
}

function mapPatient(patient: AdminPatientRecord) {
	return {
		id: patient.id,
		name: patient.name,
		email: patient.email,
		phone: patient.phone,
		gender: patient.gender,
		birth_date: patient.birthDate?.toISOString().slice(0, 10) ?? null,
		status: apiEnum(patient.status),
		created_at: patient.createdAt.toISOString(),
		updated_at: patient.updatedAt.toISOString(),
	};
}

function mapAiAnalysis(analysis: AdminAiAnalysisRecord | null) {
	if (!analysis) return null;

	return {
		summary: analysis.summary,
		detected_symptoms: Array.isArray(analysis.detectedSymptoms)
			? analysis.detectedSymptoms.filter(
					(symptom): symptom is string => typeof symptom === "string",
				)
			: [],
		duration: analysis.duration,
		severity_level: apiEnum(analysis.severityLevel),
		possible_category: analysis.possibleCategory,
		urgency_level: apiEnum(analysis.urgencyLevel),
		doctor_note_suggestion: analysis.doctorNoteSuggestion,
		confidence_score: analysis.confidenceScore.toNumber(),
		model_version: analysis.modelVersion,
		created_at: analysis.createdAt.toISOString(),
	};
}

function mapReview(review: AdminDoctorReviewRecord | null) {
	if (!review) return null;

	return {
		id: review.id,
		review_note: review.reviewNote,
		final_category: review.finalCategory,
		final_urgency_level: review.finalUrgencyLevel
			? apiEnum(review.finalUrgencyLevel)
			: null,
		recommendation: review.recommendation,
		created_at: review.createdAt.toISOString(),
		updated_at: review.updatedAt.toISOString(),
	};
}

function mapConsultationListItem(consultation: AdminConsultationListRecord) {
	return {
		id: consultation.id,
		patient: consultation.patient,
		doctor: consultation.doctor,
		status: apiEnum(consultation.status),
		created_at: consultation.createdAt.toISOString(),
		assigned_at: consultation.assignedAt?.toISOString() ?? null,
		reviewed_at: consultation.reviewedAt?.toISOString() ?? null,
		closed_at: consultation.closedAt?.toISOString() ?? null,
		ai_possible_category: consultation.aiAnalysis?.possibleCategory ?? null,
		ai_urgency_level: consultation.aiAnalysis
			? apiEnum(consultation.aiAnalysis.urgencyLevel)
			: null,
		ai_confidence_score:
			consultation.aiAnalysis?.confidenceScore.toNumber() ?? null,
	};
}

function mapConsultationDetail(consultation: AdminConsultationDetailRecord) {
	return {
		consultation: {
			id: consultation.id,
			complaint_text: consultation.complaintText,
			status: apiEnum(consultation.status),
			assigned_at: consultation.assignedAt?.toISOString() ?? null,
			reviewed_at: consultation.reviewedAt?.toISOString() ?? null,
			closed_at: consultation.closedAt?.toISOString() ?? null,
			created_at: consultation.createdAt.toISOString(),
			updated_at: consultation.updatedAt.toISOString(),
		},
		patient: mapPatient(consultation.patient),
		doctor: consultation.doctor ? mapDoctor(consultation.doctor) : null,
		ai_analysis: mapAiAnalysis(consultation.aiAnalysis),
		doctor_review: mapReview(consultation.review),
	};
}

export class AdminService {
	constructor(
		private readonly dependencies: AdminServiceDependencies = defaultDependencies,
	) {}

	async listDoctors(query: AdminAccountListQuery) {
		const options = {
			...(query.status === undefined ? {} : { status: query.status }),
			...(query.search === undefined ? {} : { search: query.search }),
			skip: (query.page - 1) * query.limit,
			take: query.limit,
		};
		const [items, total] = await Promise.all([
			this.dependencies.repository.findManyDoctors(options),
			this.dependencies.repository.countDoctors(options),
		]);
		return {
			items: items.map(mapDoctor),
			pagination: pagination(query.page, query.limit, total),
		};
	}

	async createDoctor(adminId: string, input: CreateDoctorInput) {
		const passwordHash = await this.dependencies.hashPassword(input.password);
		try {
			const doctor = await this.dependencies.repository.createDoctor(adminId, {
				name: input.name,
				email: input.email,
				passwordHash,
				licenseNumber: input.license_number,
				...(input.specialization === undefined
					? {}
					: { specialization: input.specialization }),
			});
			return { doctor: mapDoctor(doctor) };
		} catch (error) {
			if (isUniqueConstraintError(error)) {
				throw new AppError(409, "Email atau nomor lisensi dokter sudah terdaftar.");
			}
			throw error;
		}
	}

	async getDoctor(id: string) {
		const doctor = await this.dependencies.repository.findDoctorById(id);
		if (!doctor) throw new AppError(404, "Dokter tidak ditemukan.");
		return { doctor: mapDoctor(doctor) };
	}

	async updateDoctor(adminId: string, id: string, input: UpdateDoctorInput) {
		try {
			const doctor = await this.dependencies.repository.updateDoctor(id, adminId, {
				...(input.name === undefined ? {} : { name: input.name }),
				...(input.email === undefined ? {} : { email: input.email }),
				...(input.specialization === undefined
					? {}
					: { specialization: input.specialization }),
				...(input.license_number === undefined
					? {}
					: { licenseNumber: input.license_number }),
			});
			if (!doctor) throw new AppError(404, "Dokter tidak ditemukan.");
			return { doctor: mapDoctor(doctor) };
		} catch (error) {
			if (isUniqueConstraintError(error)) {
				throw new AppError(409, "Email atau nomor lisensi dokter sudah terdaftar.");
			}
			throw error;
		}
	}

	async updateDoctorStatus(
		adminId: string,
		id: string,
		input: UpdateAccountStatusInput,
	) {
		const doctor = await this.dependencies.repository.updateDoctorStatus(
			id,
			adminId,
			input.status,
		);
		if (!doctor) throw new AppError(404, "Dokter tidak ditemukan.");
		return { doctor: mapDoctor(doctor) };
	}

	async listPatients(query: AdminAccountListQuery) {
		const options = {
			...(query.status === undefined ? {} : { status: query.status }),
			...(query.search === undefined ? {} : { search: query.search }),
			skip: (query.page - 1) * query.limit,
			take: query.limit,
		};
		const [items, total] = await Promise.all([
			this.dependencies.repository.findManyPatients(options),
			this.dependencies.repository.countPatients(options),
		]);
		return {
			items: items.map(mapPatient),
			pagination: pagination(query.page, query.limit, total),
		};
	}

	async getPatient(id: string) {
		const patient = await this.dependencies.repository.findPatientById(id);
		if (!patient) throw new AppError(404, "Pasien tidak ditemukan.");
		return { patient: mapPatient(patient) };
	}

	async updatePatientStatus(
		adminId: string,
		id: string,
		input: UpdateAccountStatusInput,
	) {
		const patient = await this.dependencies.repository.updatePatientStatus(
			id,
			adminId,
			input.status,
		);
		if (!patient) throw new AppError(404, "Pasien tidak ditemukan.");
		return { patient: mapPatient(patient) };
	}

	async listConsultations(query: AdminConsultationListQuery) {
		const options = {
			...(query.status === undefined ? {} : { status: query.status }),
			...(query.patient_id === undefined ? {} : { patientId: query.patient_id }),
			...(query.doctor_id === undefined ? {} : { doctorId: query.doctor_id }),
			...(query.urgency_level === undefined
				? {}
				: { urgencyLevel: query.urgency_level }),
			skip: (query.page - 1) * query.limit,
			take: query.limit,
		};
		const [items, total] = await Promise.all([
			this.dependencies.repository.findManyConsultations(options),
			this.dependencies.repository.countConsultations(options),
		]);
		return {
			items: items.map(mapConsultationListItem),
			pagination: pagination(query.page, query.limit, total),
		};
	}

	async getConsultation(id: string, adminId: string) {
		const consultation =
			await this.dependencies.repository.findConsultationDetail(id, adminId);
		if (!consultation) throw new AppError(404, "Konsultasi tidak ditemukan.");
		return mapConsultationDetail(consultation);
	}

	async listAuditLogs(query: AdminAuditLogListQuery) {
		const options = {
			...(query.actor_type === undefined ? {} : { actorType: query.actor_type }),
			...(query.actor_id === undefined ? {} : { actorId: query.actor_id }),
			...(query.consultation_id === undefined
				? {}
				: { consultationId: query.consultation_id }),
			...(query.action === undefined ? {} : { action: query.action }),
			skip: (query.page - 1) * query.limit,
			take: query.limit,
		};
		const [items, total] = await Promise.all([
			this.dependencies.repository.findManyAuditLogs(options),
			this.dependencies.repository.countAuditLogs(options),
		]);
		return {
			items: items.map((log) => ({
				id: log.id,
				actor_type: apiEnum(log.actorType),
				actor_id: log.actorId,
				consultation_id: log.consultationId,
				action: log.action,
				description: log.description,
				ip_address: log.ipAddress,
				user_agent: log.userAgent,
				created_at: log.createdAt.toISOString(),
			})),
			pagination: pagination(query.page, query.limit, total),
		};
	}
}

export const adminService = new AdminService();
