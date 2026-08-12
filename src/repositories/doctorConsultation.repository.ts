import {
	ActorType,
	ConsultationStatus,
	type SeverityLevel,
	type UrgencyLevel,
} from "../generated/prisma/enums";

import { prisma } from "../config/database.config";
import type { DecimalValue } from "./consultation.repository";

export interface DoctorAiAnalysisRecord {
	summary: string;
	detectedSymptoms: unknown;
	duration: string | null;
	severityLevel: SeverityLevel;
	possibleCategory: string;
	urgencyLevel: UrgencyLevel;
	doctorNoteSuggestion: string | null;
	confidenceScore: DecimalValue;
	modelVersion: string;
}

export interface DoctorReviewRecord {
	id: string;
	reviewNote: string;
	finalCategory: string | null;
	finalUrgencyLevel: UrgencyLevel | null;
	recommendation: string | null;
	createdAt: Date;
}

export interface DoctorConsultationListRecord {
	id: string;
	complaintText: string;
	status: ConsultationStatus;
	createdAt: Date;
	assignedAt: Date | null;
	aiAnalysis: Pick<
		DoctorAiAnalysisRecord,
		"summary" | "possibleCategory" | "urgencyLevel" | "confidenceScore"
	> | null;
}

export interface DoctorConsultationDetailRecord {
	id: string;
	complaintText: string;
	status: ConsultationStatus;
	assignedAt: Date | null;
	reviewedAt: Date | null;
	closedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
	patient: {
		id: string;
		name: string;
		gender: string | null;
		birthDate: Date | null;
	};
	aiAnalysis: DoctorAiAnalysisRecord | null;
	review: DoctorReviewRecord | null;
}

export interface DoctorListOptions {
	doctorId: string;
	scope: "available" | "mine";
	status?: ConsultationStatus;
	skip: number;
	take: number;
}

export interface DoctorReviewPersistenceInput {
	reviewNote: string;
	finalCategory: string | null;
	finalUrgencyLevel: UrgencyLevel | null;
	recommendation: string | null;
}

export type MutationResult<T> =
	| { kind: "success"; value: T }
	| { kind: "not_found" }
	| { kind: "conflict" };

const listSelect = {
	id: true,
	complaintText: true,
	status: true,
	createdAt: true,
	assignedAt: true,
	aiAnalysis: {
		select: {
			summary: true,
			possibleCategory: true,
			urgencyLevel: true,
			confidenceScore: true,
		},
	},
} as const;

const detailSelect = {
	id: true,
	complaintText: true,
	status: true,
	assignedAt: true,
	reviewedAt: true,
	closedAt: true,
	createdAt: true,
	updatedAt: true,
	patient: {
		select: { id: true, name: true, gender: true, birthDate: true },
	},
	aiAnalysis: {
		select: {
			summary: true,
			detectedSymptoms: true,
			duration: true,
			severityLevel: true,
			possibleCategory: true,
			urgencyLevel: true,
			doctorNoteSuggestion: true,
			confidenceScore: true,
			modelVersion: true,
		},
	},
	review: {
		select: {
			id: true,
			reviewNote: true,
			finalCategory: true,
			finalUrgencyLevel: true,
			recommendation: true,
			createdAt: true,
		},
	},
} as const;

function listWhere(options: DoctorListOptions) {
	if (options.scope === "mine") {
		return {
			doctorId: options.doctorId,
			...(options.status === undefined ? {} : { status: options.status }),
		};
	}

	return {
		doctorId: null,
		AND: [
			{ status: ConsultationStatus.ANALYZED },
			...(options.status === undefined ? [] : [{ status: options.status }]),
		],
	};
}

function doctorAudit(doctorId: string, consultationId: string, action: string) {
	return {
		actorType: ActorType.DOCTOR,
		actorId: doctorId,
		consultationId,
		action,
		description: `Aktivitas dokter: ${action}.`,
	};
}

export const doctorConsultationRepository = {
	findMany(options: DoctorListOptions): Promise<DoctorConsultationListRecord[]> {
		return prisma.consultation.findMany({
			where: listWhere(options),
			select: listSelect,
			orderBy: { createdAt: "desc" },
			skip: options.skip,
			take: options.take,
		});
	},

	count(options: DoctorListOptions): Promise<number> {
		return prisma.consultation.count({ where: listWhere(options) });
	},

	async findAccessibleDetail(
		id: string,
		doctorId: string,
	): Promise<DoctorConsultationDetailRecord | null> {
		return prisma.$transaction(async (transaction) => {
			const consultation = await transaction.consultation.findFirst({
				where: {
					id,
					OR: [
						{ status: ConsultationStatus.ANALYZED, doctorId: null },
						{ doctorId },
					],
				},
				select: detailSelect,
			});

			if (!consultation) return null;

			await transaction.auditLog.create({
				data: doctorAudit(doctorId, id, "DOCTOR_VIEW_CONSULTATION"),
			});

			return consultation;
		});
	},

	async claim(
		id: string,
		doctorId: string,
		assignedAt: Date,
	): Promise<MutationResult<{ id: string; doctorId: string; status: ConsultationStatus; assignedAt: Date | null }>> {
		return prisma.$transaction(async (transaction) => {
			const claimed = await transaction.consultation.updateMany({
				where: { id, doctorId: null, status: ConsultationStatus.ANALYZED },
				data: {
					doctorId,
					assignedAt,
					status: ConsultationStatus.IN_REVIEW,
				},
			});

			if (claimed.count !== 1) {
				const exists = await transaction.consultation.count({ where: { id } });
				return exists === 0 ? { kind: "not_found" } : { kind: "conflict" };
			}

			await transaction.auditLog.create({
				data: doctorAudit(doctorId, id, "DOCTOR_CLAIM_CONSULTATION"),
			});

			const value = await transaction.consultation.findUniqueOrThrow({
				where: { id },
				select: { id: true, doctorId: true, status: true, assignedAt: true },
			});

			return { kind: "success", value: { ...value, doctorId: value.doctorId! } };
		});
	},

	async createReview(
		id: string,
		doctorId: string,
		input: DoctorReviewPersistenceInput,
		reviewedAt: Date,
	): Promise<MutationResult<DoctorReviewRecord>> {
		return prisma.$transaction(async (transaction) => {
			const consultation = await transaction.consultation.findUnique({
				where: { id },
				select: { doctorId: true },
			});

			if (!consultation || consultation.doctorId !== doctorId) {
				return { kind: "not_found" };
			}

			const transitioned = await transaction.consultation.updateMany({
				where: {
					id,
					doctorId,
					status: ConsultationStatus.IN_REVIEW,
					review: { is: null },
				},
				data: { status: ConsultationStatus.REVIEWED, reviewedAt },
			});

			if (transitioned.count !== 1) return { kind: "conflict" };

			const review = await transaction.doctorReview.create({
				data: { consultationId: id, doctorId, ...input },
				select: detailSelect.review.select,
			});

			await transaction.auditLog.create({
				data: doctorAudit(doctorId, id, "DOCTOR_REVIEW_CREATED"),
			});

			return { kind: "success", value: review };
		});
	},

	async close(
		id: string,
		doctorId: string,
		closedAt: Date,
	): Promise<MutationResult<{ id: string; status: ConsultationStatus; closedAt: Date | null }>> {
		return prisma.$transaction(async (transaction) => {
			const consultation = await transaction.consultation.findUnique({
				where: { id },
				select: { doctorId: true },
			});

			if (!consultation || consultation.doctorId !== doctorId) {
				return { kind: "not_found" };
			}

			const transitioned = await transaction.consultation.updateMany({
				where: {
					id,
					doctorId,
					status: ConsultationStatus.REVIEWED,
					review: { isNot: null },
				},
				data: { status: ConsultationStatus.CLOSED, closedAt },
			});

			if (transitioned.count !== 1) return { kind: "conflict" };

			await transaction.auditLog.create({
				data: doctorAudit(doctorId, id, "CONSULTATION_STATUS_UPDATED"),
			});

			const value = await transaction.consultation.findUniqueOrThrow({
				where: { id },
				select: { id: true, status: true, closedAt: true },
			});

			return { kind: "success", value };
		});
	},
};

export type DoctorConsultationRepository = typeof doctorConsultationRepository;
