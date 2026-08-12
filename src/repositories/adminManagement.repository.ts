import type { Prisma } from "../generated/prisma/client";
import {
	ActorType,
	type AccountStatus,
	type ConsultationStatus,
	type SeverityLevel,
	type UrgencyLevel,
} from "../generated/prisma/enums";

import { prisma } from "../config/database.config";
import type { DecimalValue } from "./consultation.repository";

export interface AdminAccountListOptions {
	status?: AccountStatus;
	search?: string;
	skip: number;
	take: number;
}

export interface AdminConsultationListOptions {
	status?: ConsultationStatus;
	patientId?: string;
	doctorId?: string;
	urgencyLevel?: UrgencyLevel;
	skip: number;
	take: number;
}

export interface AdminAuditListOptions {
	actorType?: ActorType;
	actorId?: string;
	consultationId?: string;
	action?: string;
	skip: number;
	take: number;
}

export interface AdminDoctorRecord {
	id: string;
	name: string;
	email: string;
	specialization: string | null;
	licenseNumber: string;
	status: AccountStatus;
	createdAt: Date;
	updatedAt: Date;
}

export interface AdminPatientRecord {
	id: string;
	name: string;
	email: string;
	phone: string;
	gender: string | null;
	birthDate: Date | null;
	status: AccountStatus;
	createdAt: Date;
	updatedAt: Date;
}

export interface AdminAiAnalysisRecord {
	summary: string;
	detectedSymptoms: unknown;
	duration: string | null;
	severityLevel: SeverityLevel;
	possibleCategory: string;
	urgencyLevel: UrgencyLevel;
	doctorNoteSuggestion: string | null;
	confidenceScore: DecimalValue;
	modelVersion: string;
	createdAt: Date;
}

export interface AdminDoctorReviewRecord {
	id: string;
	reviewNote: string;
	finalCategory: string | null;
	finalUrgencyLevel: UrgencyLevel | null;
	recommendation: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface AdminConsultationListRecord {
	id: string;
	status: ConsultationStatus;
	createdAt: Date;
	assignedAt: Date | null;
	reviewedAt: Date | null;
	closedAt: Date | null;
	patient: { id: string; name: string; email: string };
	doctor: { id: string; name: string; email: string } | null;
	aiAnalysis: {
		possibleCategory: string;
		urgencyLevel: UrgencyLevel;
		confidenceScore: DecimalValue;
	} | null;
}

export interface AdminConsultationDetailRecord {
	id: string;
	complaintText: string;
	status: ConsultationStatus;
	assignedAt: Date | null;
	reviewedAt: Date | null;
	closedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
	patient: AdminPatientRecord;
	doctor: AdminDoctorRecord | null;
	aiAnalysis: AdminAiAnalysisRecord | null;
	review: AdminDoctorReviewRecord | null;
}

export interface AdminAuditLogRecord {
	id: string;
	actorType: ActorType;
	actorId: string | null;
	consultationId: string | null;
	action: string;
	description: string | null;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: Date;
}

export interface CreateAdminDoctorData {
	name: string;
	email: string;
	passwordHash: string;
	specialization?: string | null;
	licenseNumber: string;
}

export interface UpdateAdminDoctorData {
	name?: string;
	email?: string;
	specialization?: string | null;
	licenseNumber?: string;
}

const doctorSelect = {
	id: true,
	name: true,
	email: true,
	specialization: true,
	licenseNumber: true,
	status: true,
	createdAt: true,
	updatedAt: true,
} as const;

const patientSelect = {
	id: true,
	name: true,
	email: true,
	phone: true,
	gender: true,
	birthDate: true,
	status: true,
	createdAt: true,
	updatedAt: true,
} as const;

const aiAnalysisSelect = {
	summary: true,
	detectedSymptoms: true,
	duration: true,
	severityLevel: true,
	possibleCategory: true,
	urgencyLevel: true,
	doctorNoteSuggestion: true,
	confidenceScore: true,
	modelVersion: true,
	createdAt: true,
} as const;

const reviewSelect = {
	id: true,
	reviewNote: true,
	finalCategory: true,
	finalUrgencyLevel: true,
	recommendation: true,
	createdAt: true,
	updatedAt: true,
} as const;

function adminAudit(
	adminId: string,
	action: string,
	description: string,
	consultationId?: string,
) {
	return {
		actorType: ActorType.ADMIN,
		actorId: adminId,
		consultationId,
		action,
		description,
	};
}

function doctorWhere(options: AdminAccountListOptions): Prisma.DoctorWhereInput {
	return {
		...(options.status === undefined ? {} : { status: options.status }),
		...(options.search === undefined
			? {}
			: {
					OR: [
						{ name: { contains: options.search, mode: "insensitive" } },
						{ email: { contains: options.search, mode: "insensitive" } },
						{ licenseNumber: { contains: options.search, mode: "insensitive" } },
						{ specialization: { contains: options.search, mode: "insensitive" } },
					],
				}),
	};
}

function patientWhere(options: AdminAccountListOptions): Prisma.PatientWhereInput {
	return {
		...(options.status === undefined ? {} : { status: options.status }),
		...(options.search === undefined
			? {}
			: {
					OR: [
						{ name: { contains: options.search, mode: "insensitive" } },
						{ email: { contains: options.search, mode: "insensitive" } },
						{ phone: { contains: options.search, mode: "insensitive" } },
					],
				}),
	};
}

function consultationWhere(
	options: AdminConsultationListOptions,
): Prisma.ConsultationWhereInput {
	return {
		...(options.status === undefined ? {} : { status: options.status }),
		...(options.patientId === undefined ? {} : { patientId: options.patientId }),
		...(options.doctorId === undefined ? {} : { doctorId: options.doctorId }),
		...(options.urgencyLevel === undefined
			? {}
			: { aiAnalysis: { is: { urgencyLevel: options.urgencyLevel } } }),
	};
}

function auditWhere(options: AdminAuditListOptions): Prisma.AuditLogWhereInput {
	return {
		...(options.actorType === undefined ? {} : { actorType: options.actorType }),
		...(options.actorId === undefined ? {} : { actorId: options.actorId }),
		...(options.consultationId === undefined
			? {}
			: { consultationId: options.consultationId }),
		...(options.action === undefined ? {} : { action: options.action }),
	};
}

export const adminManagementRepository = {
	findManyDoctors(options: AdminAccountListOptions): Promise<AdminDoctorRecord[]> {
		return prisma.doctor.findMany({
			where: doctorWhere(options),
			select: doctorSelect,
			orderBy: { createdAt: "desc" },
			skip: options.skip,
			take: options.take,
		});
	},

	countDoctors(options: AdminAccountListOptions): Promise<number> {
		return prisma.doctor.count({ where: doctorWhere(options) });
	},

	findDoctorById(id: string): Promise<AdminDoctorRecord | null> {
		return prisma.doctor.findUnique({ where: { id }, select: doctorSelect });
	},

	createDoctor(
		adminId: string,
		data: CreateAdminDoctorData,
	): Promise<AdminDoctorRecord> {
		return prisma.$transaction(async (transaction) => {
			const doctor = await transaction.doctor.create({ data, select: doctorSelect });
			await transaction.auditLog.create({
				data: adminAudit(
					adminId,
					"ADMIN_CREATE_DOCTOR",
					"Admin membuat akun dokter.",
				),
			});
			return doctor;
		});
	},

	updateDoctor(
		id: string,
		adminId: string,
		data: UpdateAdminDoctorData,
	): Promise<AdminDoctorRecord | null> {
		return prisma.$transaction(async (transaction) => {
			const exists = await transaction.doctor.findUnique({
				where: { id },
				select: { id: true },
			});
			if (!exists) return null;

			const doctor = await transaction.doctor.update({
				where: { id },
				data,
				select: doctorSelect,
			});
			await transaction.auditLog.create({
				data: adminAudit(
					adminId,
					"ADMIN_UPDATE_DOCTOR",
					"Admin memperbarui profil dokter.",
				),
			});
			return doctor;
		});
	},

	updateDoctorStatus(
		id: string,
		adminId: string,
		status: AccountStatus,
	): Promise<AdminDoctorRecord | null> {
		return prisma.$transaction(async (transaction) => {
			const exists = await transaction.doctor.findUnique({ where: { id }, select: { id: true } });
			if (!exists) return null;
			const doctor = await transaction.doctor.update({ where: { id }, data: { status }, select: doctorSelect });
			await transaction.auditLog.create({ data: adminAudit(adminId, "ADMIN_UPDATE_ACCOUNT_STATUS", "Admin memperbarui status akun dokter.") });
			return doctor;
		});
	},

	findManyPatients(options: AdminAccountListOptions): Promise<AdminPatientRecord[]> {
		return prisma.patient.findMany({ where: patientWhere(options), select: patientSelect, orderBy: { createdAt: "desc" }, skip: options.skip, take: options.take });
	},

	countPatients(options: AdminAccountListOptions): Promise<number> {
		return prisma.patient.count({ where: patientWhere(options) });
	},

	findPatientById(id: string): Promise<AdminPatientRecord | null> {
		return prisma.patient.findUnique({ where: { id }, select: patientSelect });
	},

	updatePatientStatus(
		id: string,
		adminId: string,
		status: AccountStatus,
	): Promise<AdminPatientRecord | null> {
		return prisma.$transaction(async (transaction) => {
			const exists = await transaction.patient.findUnique({ where: { id }, select: { id: true } });
			if (!exists) return null;
			const patient = await transaction.patient.update({ where: { id }, data: { status }, select: patientSelect });
			await transaction.auditLog.create({ data: adminAudit(adminId, "ADMIN_UPDATE_ACCOUNT_STATUS", "Admin memperbarui status akun pasien.") });
			return patient;
		});
	},

	findManyConsultations(options: AdminConsultationListOptions): Promise<AdminConsultationListRecord[]> {
		return prisma.consultation.findMany({
			where: consultationWhere(options),
			select: {
				id: true,
				status: true,
				createdAt: true,
				assignedAt: true,
				reviewedAt: true,
				closedAt: true,
				patient: { select: { id: true, name: true, email: true } },
				doctor: { select: { id: true, name: true, email: true } },
				aiAnalysis: { select: { possibleCategory: true, urgencyLevel: true, confidenceScore: true } },
			},
			orderBy: { createdAt: "desc" },
			skip: options.skip,
			take: options.take,
		});
	},

	countConsultations(options: AdminConsultationListOptions): Promise<number> {
		return prisma.consultation.count({ where: consultationWhere(options) });
	},

	findConsultationDetail(
		id: string,
		adminId: string,
	): Promise<AdminConsultationDetailRecord | null> {
		return prisma.$transaction(async (transaction) => {
			const consultation = await transaction.consultation.findUnique({
				where: { id },
				select: {
					id: true,
					complaintText: true,
					status: true,
					assignedAt: true,
					reviewedAt: true,
					closedAt: true,
					createdAt: true,
					updatedAt: true,
					patient: { select: patientSelect },
					doctor: { select: doctorSelect },
					aiAnalysis: { select: aiAnalysisSelect },
					review: { select: reviewSelect },
				},
			});
			if (!consultation) return null;

			await transaction.auditLog.create({
				data: adminAudit(
					adminId,
					"ADMIN_VIEW_CONSULTATION",
					"Admin melihat detail konsultasi.",
					id,
				),
			});
			return consultation;
		});
	},

	findManyAuditLogs(options: AdminAuditListOptions): Promise<AdminAuditLogRecord[]> {
		return prisma.auditLog.findMany({ where: auditWhere(options), orderBy: { createdAt: "desc" }, skip: options.skip, take: options.take });
	},

	countAuditLogs(options: AdminAuditListOptions): Promise<number> {
		return prisma.auditLog.count({ where: auditWhere(options) });
	},
};

export type AdminManagementRepository = typeof adminManagementRepository;
