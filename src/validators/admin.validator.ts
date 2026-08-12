import {
	AccountStatus,
	ActorType,
	ConsultationStatus,
	UrgencyLevel,
} from "../generated/prisma/enums";
import { z } from "zod";

import type {
	AdminAccountListQuery,
	AdminAuditLogListQuery,
	AdminConsultationListQuery,
	AdminIdParams,
	CreateDoctorInput,
	UpdateAccountStatusInput,
	UpdateDoctorInput,
} from "../types/admin.type";

const pagination = {
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(10),
};

const mappedEnum = <T extends string>(values: readonly T[], message: string) =>
	z
		.string()
		.trim()
		.toLowerCase()
		.refine((value) => values.some((item) => item.toLowerCase() === value), message)
		.transform((value) => value.toUpperCase() as T);

const accountStatus = mappedEnum(
	Object.values(AccountStatus),
	"Status akun tidak valid.",
);
const consultationStatus = mappedEnum(
	Object.values(ConsultationStatus),
	"Status konsultasi tidak valid.",
);
const urgencyLevel = mappedEnum(
	Object.values(UrgencyLevel),
	"Tingkat urgensi tidak valid.",
);
const actorType = mappedEnum(
	Object.values(ActorType),
	"Tipe aktor tidak valid.",
);

const nullableSpecialization = z
	.string()
	.trim()
	.min(1, "Spesialisasi tidak boleh kosong.")
	.max(255, "Spesialisasi maksimal 255 karakter.")
	.nullable()
	.optional();

export const adminAccountListQuerySchema: z.ZodType<AdminAccountListQuery> = z
	.object({
		status: accountStatus.optional(),
		search: z.string().trim().min(1, "Pencarian tidak boleh kosong.").max(255).optional(),
		...pagination,
	})
	.strict();

export const adminIdParamsSchema: z.ZodType<AdminIdParams> = z
	.object({ id: z.string().uuid("ID tidak valid.") })
	.strict();

export const createDoctorSchema: z.ZodType<CreateDoctorInput> = z
	.object({
		name: z.string().trim().min(1, "Nama wajib diisi.").max(255),
		email: z.string().trim().max(254, "Email maksimal 254 karakter.").email("Email tidak valid.").toLowerCase(),
		password: z.string().min(8, "Password minimal 8 karakter.").max(128, "Password maksimal 128 karakter."),
		specialization: nullableSpecialization,
		license_number: z
			.string()
			.trim()
			.min(1, "Nomor lisensi wajib diisi.")
			.max(255),
	})
	.strict();

export const updateDoctorSchema: z.ZodType<UpdateDoctorInput> = z
	.object({
		name: z.string().trim().min(1, "Nama tidak boleh kosong.").max(255).optional(),
		email: z.string().trim().max(254, "Email maksimal 254 karakter.").email("Email tidak valid.").toLowerCase().optional(),
		specialization: nullableSpecialization,
		license_number: z.string().trim().min(1, "Nomor lisensi tidak boleh kosong.").max(255).optional(),
	})
	.strict()
	.refine((value) => Object.keys(value).length > 0, {
		message: "Minimal satu field harus diisi.",
	});

export const updateAccountStatusSchema: z.ZodType<UpdateAccountStatusInput> = z
	.object({ status: accountStatus })
	.strict();

export const adminConsultationListQuerySchema: z.ZodType<AdminConsultationListQuery> =
	z
		.object({
			status: consultationStatus.optional(),
			patient_id: z.string().uuid("ID pasien tidak valid.").optional(),
			doctor_id: z.string().uuid("ID dokter tidak valid.").optional(),
			urgency_level: urgencyLevel.optional(),
			...pagination,
		})
		.strict();

export const adminAuditLogListQuerySchema: z.ZodType<AdminAuditLogListQuery> = z
	.object({
		actor_type: actorType.optional(),
		actor_id: z.string().uuid("ID aktor tidak valid.").optional(),
		consultation_id: z.string().uuid("ID konsultasi tidak valid.").optional(),
		action: z.string().trim().min(1, "Action tidak boleh kosong.").max(255).optional(),
		...pagination,
	})
	.strict();
