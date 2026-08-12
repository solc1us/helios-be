import {
	consultationRepository,
	type ConsultationRecord,
	type ConsultationRepository,
	type PatientConsultationListRecord,
	type PatientDashboardStatisticsRecord,
} from "../repositories/consultation.repository";
import {
	aiProcessingService,
	type ConsultationProcessor,
} from "./aiProcessing.service";
import { ConsultationStatus } from "../generated/prisma/enums";
import type {
	ConsultationListQuery,
	CreateConsultationInput,
} from "../types/consultation.type";
import { AppError } from "../utils/app-error";

const COMPLAINT_PREVIEW_LENGTH = 100;

function apiStatus(status: ConsultationRecord["status"]): string {
	return status.toLowerCase();
}

function isReviewed(status: ConsultationStatus): boolean {
	return (
		status === ConsultationStatus.REVIEWED ||
		status === ConsultationStatus.CLOSED
	);
}

function compareCategories(left: string, right: string): number {
	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
}

function mapPatientListItem(consultation: PatientConsultationListRecord) {
	const canExposeReviewedData = isReviewed(consultation.status);

	return {
		id: consultation.id,
		complaint_text: createComplaintPreview(consultation.complaintText),
		status: apiStatus(consultation.status),
		created_at: consultation.createdAt.toISOString(),
		category: canExposeReviewedData
			? (consultation.review?.finalCategory ?? null)
			: null,
		confidence_score: canExposeReviewedData
			? (consultation.aiAnalysis?.confidenceScore.toNumber() ?? null)
			: null,
	};
}

export function buildDashboardStatistics(
	thisMonth: number,
	records: PatientDashboardStatisticsRecord[],
) {
	const categoryCounts = new Map<string, number>();
	let bestConfidence: number | null = null;

	for (const record of records) {
		if (!isReviewed(record.status)) continue;

		const category = record.review?.finalCategory;

		if (category !== null && category !== undefined) {
			categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
		}

		const confidence = record.aiAnalysis?.confidenceScore.toNumber();

		if (
			confidence !== undefined &&
			(bestConfidence === null || confidence > bestConfidence)
		) {
			bestConfidence = confidence;
		}
	}

	const categories = [...categoryCounts.entries()].sort(
		([leftCategory, leftCount], [rightCategory, rightCount]) =>
			rightCount - leftCount ||
			compareCategories(leftCategory, rightCategory),
	);
	const distribution = Object.fromEntries(
		[...categoryCounts.entries()].sort(([left], [right]) =>
			compareCategories(left, right),
		),
	);

	return {
		this_month: thisMonth,
		best_confidence: bestConfidence,
		top_diagnosis: categories[0]?.[0] ?? null,
		distribution,
	};
}

export function createComplaintPreview(complaintText: string): string {
	if (complaintText.length <= COMPLAINT_PREVIEW_LENGTH) {
		return complaintText;
	}

	return `${complaintText.slice(0, COMPLAINT_PREVIEW_LENGTH)}...`;
}

export class ConsultationService {
	constructor(
		private readonly repository: ConsultationRepository = consultationRepository,
		private readonly now: () => Date = () => new Date(),
		private readonly processor: ConsultationProcessor = aiProcessingService,
	) {}

	async createForPatient(
		patientId: string,
		input: CreateConsultationInput,
	) {
		const consultation = await this.repository.createForPatient(
			patientId,
			input.complaint_text,
		);
		const aiAnalysis = await this.processor.processConsultation(consultation.id);

		return {
			consultation: {
				id: consultation.id,
				complaint_text: consultation.complaintText,
				status: apiStatus(ConsultationStatus.ANALYZED),
				created_at: consultation.createdAt.toISOString(),
			},
			ai_analysis: aiAnalysis,
		};
	}

	async listForPatient(patientId: string, query: ConsultationListQuery) {
		const filter = {
			patientId,
			...(query.status === undefined ? {} : { status: query.status }),
		};
		const currentDate = this.now();
		const monthStart = new Date(
			Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), 1),
		);
		const nextMonthStart = new Date(
			Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() + 1, 1),
		);
		const [consultations, total, thisMonth, statisticsRecords] =
			await Promise.all([
			this.repository.findManyByPatient({
				...filter,
				skip: (query.page - 1) * query.limit,
				take: query.limit,
			}),
			this.repository.countByPatient(filter),
			this.repository.countCurrentMonthByPatient(
				patientId,
				monthStart,
				nextMonthStart,
			),
			this.repository.findDashboardStatisticsByPatient(patientId),
		]);

		return {
			items: consultations.map(mapPatientListItem),
			pagination: {
				page: query.page,
				limit: query.limit,
				total,
				total_pages: Math.ceil(total / query.limit),
			},
			statistics: buildDashboardStatistics(thisMonth, statisticsRecords),
		};
	}

	async getDetailForPatient(id: string, patientId: string) {
		const consultation = await this.repository.findByIdAndPatient(id, patientId);

		if (!consultation) {
			throw new AppError(404, "Konsultasi tidak ditemukan.");
		}

		return {
			consultation: {
				id: consultation.id,
				complaint_text: consultation.complaintText,
				status: apiStatus(consultation.status),
				created_at: consultation.createdAt.toISOString(),
				updated_at: consultation.updatedAt.toISOString(),
			},
			doctor_review: consultation.review
				? {
						final_category: consultation.review.finalCategory,
						final_urgency_level:
							consultation.review.finalUrgencyLevel?.toLowerCase() ?? null,
						recommendation: consultation.review.recommendation,
						reviewed_at: consultation.reviewedAt?.toISOString() ?? null,
					}
				: null,
		};
	}
}

export const consultationService = new ConsultationService();
