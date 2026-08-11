import { ConsultationStatus } from "../generated/prisma/enums";
import { z } from "zod";

import type {
	ConsultationDetailParams,
	ConsultationListQuery,
	CreateConsultationInput,
} from "../types/consultation.type";

const consultationStatuses = Object.values(ConsultationStatus);

const apiConsultationStatusSchema = z
	.string()
	.trim()
	.refine(
		(value) =>
			consultationStatuses.some((status) => status.toLowerCase() === value),
		"Status konsultasi tidak valid.",
	)
	.transform((value) => value.toUpperCase() as ConsultationStatus);

export const createConsultationSchema: z.ZodType<CreateConsultationInput> = z
	.object({
		complaint_text: z
			.string()
			.trim()
			.min(1, "Keluhan wajib diisi.")
			.min(10, "Keluhan minimal 10 karakter.")
			.max(5000, "Keluhan maksimal 5000 karakter."),
	})
	.strict();

export const consultationListQuerySchema: z.ZodType<ConsultationListQuery> = z
	.object({
		status: apiConsultationStatusSchema.optional(),
		page: z.coerce
			.number()
			.int("Page harus berupa bilangan bulat.")
			.positive("Page harus lebih dari 0.")
			.default(1),
		limit: z.coerce
			.number()
			.int("Limit harus berupa bilangan bulat.")
			.positive("Limit harus lebih dari 0.")
			.max(100, "Limit maksimal 100.")
			.default(10),
	})
	.strict();

export const consultationDetailParamsSchema: z.ZodType<ConsultationDetailParams> =
	z
		.object({
			id: z.string().uuid("ID konsultasi tidak valid."),
		})
		.strict();
