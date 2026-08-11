import type { ConsultationStatus } from "../generated/prisma/enums";

export interface CreateConsultationInput {
	complaint_text: string;
}

export interface ConsultationListQuery {
	status?: ConsultationStatus;
	page: number;
	limit: number;
}

export interface ConsultationDetailParams {
	id: string;
}
