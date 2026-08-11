import { describe, expect, test } from "bun:test";

import { ConsultationStatus } from "../src/generated/prisma/enums";
import {
	consultationDetailParamsSchema,
	consultationListQuerySchema,
	createConsultationSchema,
} from "../src/validators/consultation.validator";

describe("consultation validation", () => {
	test("accepts and trims a valid complaint", () => {
		const result = createConsultationSchema.parse({
			complaint_text: "  Saya demam sejak kemarin.  ",
		});

		expect(result.complaint_text).toBe("Saya demam sejak kemarin.");
	});

	test.each([
		["empty", "   "],
		["too short", "Demam"],
		["too long", "a".repeat(5001)],
	])("rejects an %s complaint", (_case, complaintText) => {
		expect(
			createConsultationSchema.safeParse({ complaint_text: complaintText })
				.success,
		).toBe(false);
	});

	test("rejects unknown body fields", () => {
		const result = createConsultationSchema.safeParse({
			complaint_text: "Saya demam sejak kemarin.",
			patient_id: "other-patient",
		});

		expect(result.success).toBe(false);
	});

	test("maps a valid API status and applies pagination defaults", () => {
		const result = consultationListQuerySchema.parse({ status: "in_review" });

		expect(result).toEqual({
			status: ConsultationStatus.IN_REVIEW,
			page: 1,
			limit: 10,
		});
	});

	test.each([
		["status", { status: "unknown" }],
		["page", { page: "0" }],
		["page", { page: "1.5" }],
		["limit", { limit: "0" }],
		["limit", { limit: "101" }],
	])("rejects invalid %s input", (_field, query) => {
		expect(consultationListQuerySchema.safeParse(query).success).toBe(false);
	});

	test("rejects an invalid consultation UUID", () => {
		expect(
			consultationDetailParamsSchema.safeParse({ id: "not-a-uuid" }).success,
		).toBe(false);
	});
});
