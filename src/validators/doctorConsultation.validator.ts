import { ConsultationStatus, UrgencyLevel } from "../generated/prisma/enums";
import { z } from "zod";

import type {
	CloseConsultationInput,
	DoctorConsultationListQuery,
	DoctorConsultationParams,
	DoctorReviewInput,
} from "../types/doctorConsultation.type";

const statuses = Object.values(ConsultationStatus);

const statusSchema = z
	.string()
	.trim()
	.refine(
		(value) => statuses.some((status) => status.toLowerCase() === value),
		"Status konsultasi tidak valid.",
	)
	.transform((value) => value.toUpperCase() as ConsultationStatus);

const nullableTrimmed = (maximum: number, message: string) =>
	z.string().trim().max(maximum, message).nullable().optional();

export const doctorConsultationListQuerySchema: z.ZodType<DoctorConsultationListQuery> =
	z
		.object({
			scope: z.enum(["available", "mine"]).default("available"),
			status: statusSchema.optional(),
			page: z.coerce.number().int().positive().default(1),
			limit: z.coerce.number().int().positive().max(100).default(10),
		})
		.strict();

export const doctorConsultationParamsSchema: z.ZodType<DoctorConsultationParams> =
	z.object({ id: z.string().uuid("ID konsultasi tidak valid.") }).strict();

export const doctorReviewSchema: z.ZodType<DoctorReviewInput> = z
	.object({
		review_note: z
			.string()
			.trim()
			.min(1, "Catatan review wajib diisi.")
			.max(5000, "Catatan review maksimal 5000 karakter."),
		final_category: z
			.string()
			.trim()
			.min(1, "Kategori akhir tidak boleh kosong.")
			.max(255, "Kategori akhir maksimal 255 karakter.")
			.nullable()
			.optional(),
		final_urgency_level: z
			.enum(["normal", "priority", "urgent"])
			.transform((value) => value.toUpperCase() as UrgencyLevel)
			.nullable()
			.optional(),
		recommendation: nullableTrimmed(
			5000,
			"Rekomendasi maksimal 5000 karakter.",
		),
	})
	.strict();

export const closeConsultationSchema: z.ZodType<CloseConsultationInput> = z
	.object({ status: z.literal("closed", "Status hanya dapat diubah menjadi closed.") })
	.strict();
