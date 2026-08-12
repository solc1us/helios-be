import type { ConsultationStatus } from "../generated/prisma/enums";
import {
	doctorConsultationRepository,
	type DoctorAiAnalysisRecord,
	type DoctorConsultationDetailRecord,
	type DoctorConsultationListRecord,
	type DoctorConsultationRepository,
	type DoctorReviewRecord,
} from "../repositories/doctorConsultation.repository";
import type {
	DoctorConsultationListQuery,
	DoctorReviewInput,
} from "../types/doctorConsultation.type";
import { AppError } from "../utils/app-error";
import { createComplaintPreview } from "./consultation.service";

function apiEnum(value: string): string {
	return value.toLowerCase();
}

function mapListItem(consultation: DoctorConsultationListRecord) {
	return {
		id: consultation.id,
		complaint_text: createComplaintPreview(consultation.complaintText),
		status: apiEnum(consultation.status),
		created_at: consultation.createdAt.toISOString(),
		assigned_at: consultation.assignedAt?.toISOString() ?? null,
		ai_summary: consultation.aiAnalysis?.summary ?? null,
		possible_category: consultation.aiAnalysis?.possibleCategory ?? null,
		urgency_level: consultation.aiAnalysis
			? apiEnum(consultation.aiAnalysis.urgencyLevel)
			: null,
		confidence_score:
			consultation.aiAnalysis?.confidenceScore.toNumber() ?? null,
	};
}

function mapAiAnalysis(analysis: DoctorAiAnalysisRecord | null) {
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
	};
}

function mapReview(review: DoctorReviewRecord | null) {
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
	};
}

function mapDetail(consultation: DoctorConsultationDetailRecord) {
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
		patient: {
			id: consultation.patient.id,
			name: consultation.patient.name,
			gender: consultation.patient.gender,
			birth_date:
				consultation.patient.birthDate?.toISOString().slice(0, 10) ?? null,
		},
		ai_analysis: mapAiAnalysis(consultation.aiAnalysis),
		doctor_review: mapReview(consultation.review),
	};
}

export class DoctorConsultationService {
	constructor(
		private readonly repository: DoctorConsultationRepository =
			doctorConsultationRepository,
		private readonly now: () => Date = () => new Date(),
	) {}

	async list(doctorId: string, query: DoctorConsultationListQuery) {
		const options = {
			doctorId,
			scope: query.scope,
			...(query.status === undefined ? {} : { status: query.status }),
			skip: (query.page - 1) * query.limit,
			take: query.limit,
		};
		const [consultations, total] = await Promise.all([
			this.repository.findMany(options),
			this.repository.count(options),
		]);

		return {
			items: consultations.map(mapListItem),
			pagination: {
				page: query.page,
				limit: query.limit,
				total,
				total_pages: Math.ceil(total / query.limit),
			},
		};
	}

	async getDetail(id: string, doctorId: string) {
		const consultation = await this.repository.findAccessibleDetail(id, doctorId);

		if (!consultation) throw new AppError(404, "Konsultasi tidak ditemukan.");

		return mapDetail(consultation);
	}

	async claim(id: string, doctorId: string) {
		const result = await this.repository.claim(id, doctorId, this.now());

		if (result.kind === "not_found") {
			throw new AppError(404, "Konsultasi tidak ditemukan.");
		}
		if (result.kind === "conflict") {
			throw new AppError(409, "Konsultasi tidak dapat diambil.");
		}

		return {
			consultation: {
				id: result.value.id,
				doctor_id: result.value.doctorId,
				status: apiEnum(result.value.status),
				assigned_at: result.value.assignedAt?.toISOString() ?? null,
			},
		};
	}

	async review(id: string, doctorId: string, input: DoctorReviewInput) {
		const result = await this.repository.createReview(
			id,
			doctorId,
			{
				reviewNote: input.review_note,
				finalCategory: input.final_category ?? null,
				finalUrgencyLevel: input.final_urgency_level ?? null,
				recommendation: input.recommendation ?? null,
			},
			this.now(),
		);

		if (result.kind === "not_found") {
			throw new AppError(404, "Konsultasi tidak ditemukan.");
		}
		if (result.kind === "conflict") {
			throw new AppError(409, "Konsultasi tidak dapat direview.");
		}

		return {
			review: mapReview(result.value),
			consultation_status: "reviewed",
		};
	}

	async close(id: string, doctorId: string) {
		const result = await this.repository.close(id, doctorId, this.now());

		if (result.kind === "not_found") {
			throw new AppError(404, "Konsultasi tidak ditemukan.");
		}
		if (result.kind === "conflict") {
			throw new AppError(409, "Status konsultasi tidak dapat diubah.");
		}

		return {
			consultation: {
				id: result.value.id,
				status: apiEnum(result.value.status),
				closed_at: result.value.closedAt?.toISOString() ?? null,
			},
		};
	}
}

export const doctorConsultationService = new DoctorConsultationService();
