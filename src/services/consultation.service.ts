import {
	consultationRepository,
	type ConsultationRecord,
	type ConsultationRepository,
} from "../repositories/consultation.repository";
import type {
	ConsultationListQuery,
	CreateConsultationInput,
} from "../types/consultation.type";
import { AppError } from "../utils/app-error";

const COMPLAINT_PREVIEW_LENGTH = 100;

function apiStatus(status: ConsultationRecord["status"]): string {
	return status.toLowerCase();
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
	) {}

	async createForPatient(
		patientId: string,
		input: CreateConsultationInput,
	) {
		const consultation = await this.repository.createForPatient(
			patientId,
			input.complaint_text,
		);

		return {
			consultation: {
				id: consultation.id,
				complaint_text: consultation.complaintText,
				status: apiStatus(consultation.status),
				created_at: consultation.createdAt.toISOString(),
			},
		};
	}

	async listForPatient(patientId: string, query: ConsultationListQuery) {
		const filter = {
			patientId,
			...(query.status === undefined ? {} : { status: query.status }),
		};
		const [consultations, total] = await Promise.all([
			this.repository.findManyByPatient({
				...filter,
				skip: (query.page - 1) * query.limit,
				take: query.limit,
			}),
			this.repository.countByPatient(filter),
		]);

		return {
			items: consultations.map((consultation) => ({
				id: consultation.id,
				complaint_preview: createComplaintPreview(
					consultation.complaintText,
				),
				status: apiStatus(consultation.status),
				created_at: consultation.createdAt.toISOString(),
			})),
			pagination: {
				page: query.page,
				limit: query.limit,
				total,
				total_pages: Math.ceil(total / query.limit),
			},
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
			doctor_review: null,
		};
	}
}

export const consultationService = new ConsultationService();
