import type {
	AccountStatus,
	ActorType,
	ConsultationStatus,
	UrgencyLevel,
} from "../generated/prisma/enums";

export interface AdminAccountListQuery {
	status?: AccountStatus;
	search?: string;
	page: number;
	limit: number;
}

export interface AdminIdParams {
	id: string;
}

export interface CreateDoctorInput {
	name: string;
	email: string;
	password: string;
	specialization?: string | null;
	license_number: string;
}

export interface UpdateDoctorInput {
	name?: string;
	email?: string;
	specialization?: string | null;
	license_number?: string;
}

export interface UpdateAccountStatusInput {
	status: AccountStatus;
}

export interface AdminConsultationListQuery {
	status?: ConsultationStatus;
	patient_id?: string;
	doctor_id?: string;
	urgency_level?: UrgencyLevel;
	page: number;
	limit: number;
}

export interface AdminAuditLogListQuery {
	actor_type?: ActorType;
	actor_id?: string;
	consultation_id?: string;
	action?: string;
	page: number;
	limit: number;
}
