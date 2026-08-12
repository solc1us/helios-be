import { describe, expect, test } from "bun:test";

import { UrgencyLevel } from "../src/generated/prisma/enums";
import {
	closeConsultationSchema,
	doctorConsultationListQuerySchema,
	doctorConsultationParamsSchema,
	doctorReviewSchema,
} from "../src/validators/doctorConsultation.validator";

describe("Doctor consultation validation", () => {
	test("applies list defaults and accepts filtering", () => {
		expect(doctorConsultationListQuerySchema.parse({})).toEqual({
			scope: "available",
			page: 1,
			limit: 10,
		});
		expect(
			doctorConsultationListQuerySchema.parse({
				scope: "mine",
				status: "reviewed",
				page: "2",
				limit: "20",
			}),
		).toMatchObject({ scope: "mine", status: "REVIEWED", page: 2, limit: 20 });
	});

	test.each([
		{ scope: "all" },
		{ page: "0" },
		{ limit: "101" },
		{ status: "unknown" },
	])("rejects invalid list query %#", (input) => {
		expect(doctorConsultationListQuerySchema.safeParse(input).success).toBe(false);
	});

	test("validates UUID params", () => {
		expect(
			doctorConsultationParamsSchema.safeParse({ id: "not-uuid" }).success,
		).toBe(false);
	});

	test("trims a valid review and maps urgency", () => {
		expect(
			doctorReviewSchema.parse({
				review_note: "  Hasil sesuai.  ",
				final_category: "  pernapasan  ",
				final_urgency_level: "normal",
				recommendation: "  Pantau gejala.  ",
			}),
		).toEqual({
			review_note: "Hasil sesuai.",
			final_category: "pernapasan",
			final_urgency_level: UrgencyLevel.NORMAL,
			recommendation: "Pantau gejala.",
		});
	});

	test("rejects missing note, invalid urgency, and forbidden fields", () => {
		expect(doctorReviewSchema.safeParse({}).success).toBe(false);
		expect(
			doctorReviewSchema.safeParse({
				review_note: "Valid note",
				final_urgency_level: "critical",
			}).success,
		).toBe(false);
		expect(
			doctorReviewSchema.safeParse({
				review_note: "Valid note",
				final_urgency_level: "NORMAL",
			}).success,
		).toBe(false);
		expect(
			doctorReviewSchema.safeParse({
				review_note: "Valid note",
				doctor_id: "forbidden",
			}).success,
		).toBe(false);
	});

	test("allows only the closed status mutation", () => {
		expect(closeConsultationSchema.parse({ status: "closed" })).toEqual({
			status: "closed",
		});
		expect(closeConsultationSchema.safeParse({ status: "reviewed" }).success).toBe(
			false,
		);
	});
});
