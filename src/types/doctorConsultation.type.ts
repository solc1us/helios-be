import type {
	ConsultationStatus,
	UrgencyLevel,
} from "../generated/prisma/enums";

export interface DoctorConsultationListQuery {
	scope: "available" | "mine";
	status?: ConsultationStatus;
	page: number;
	limit: number;
}

export interface DoctorConsultationParams {
	id: string;
}

export interface DoctorReviewInput {
	review_note: string;
	final_category?: string | null;
	final_urgency_level?: UrgencyLevel | null;
	recommendation?: string | null;
}

export interface CloseConsultationInput {
	status: "closed";
}
