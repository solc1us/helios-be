import { describe, expect, mock, test } from "bun:test";

import {
	ConsultationStatus,
	SeverityLevel,
	UrgencyLevel,
} from "../src/generated/prisma/enums";
import type {
	DoctorConsultationDetailRecord,
	DoctorConsultationListRecord,
	DoctorConsultationRepository,
	DoctorReviewRecord,
	MutationResult,
} from "../src/repositories/doctorConsultation.repository";
import { DoctorConsultationService } from "../src/services/doctorConsultation.service";

const consultationId = "061af019-5542-49f6-978a-78b819c6be3d";
const doctorId = "061af019-5542-49f6-978a-78b819c6be3e";
const otherDoctorId = "161af019-5542-49f6-978a-78b819c6be3e";
const now = new Date("2026-08-12T10:00:00.000Z");
const decimal = { toNumber: () => 0.82 };

const listRecord: DoctorConsultationListRecord = {
	id: consultationId,
	complaintText: "a".repeat(101),
	status: ConsultationStatus.ANALYZED,
	createdAt: new Date("2026-08-11T10:00:00.000Z"),
	assignedAt: null,
	aiAnalysis: {
		summary: "Ringkasan aman untuk dokter.",
		possibleCategory: "keluhan pernapasan",
		urgencyLevel: UrgencyLevel.NORMAL,
		confidenceScore: decimal,
	},
};

const reviewRecord: DoctorReviewRecord = {
	id: "261af019-5542-49f6-978a-78b819c6be3e",
	reviewNote: "Catatan internal dokter.",
	finalCategory: "keluhan pernapasan",
	finalUrgencyLevel: UrgencyLevel.NORMAL,
	recommendation: "Pantau gejala.",
	createdAt: now,
};

const detailRecord: DoctorConsultationDetailRecord = {
	id: consultationId,
	complaintText: "Keluhan lengkap pasien.",
	status: ConsultationStatus.ANALYZED,
	assignedAt: null,
	reviewedAt: null,
	closedAt: null,
	createdAt: new Date("2026-08-11T10:00:00.000Z"),
	updatedAt: new Date("2026-08-11T10:05:00.000Z"),
	patient: {
		id: "361af019-5542-49f6-978a-78b819c6be3e",
		name: "Pasien Test",
		gender: "male",
		birthDate: new Date("2001-05-10T00:00:00.000Z"),
	},
	aiAnalysis: {
		summary: "Ringkasan aman untuk dokter.",
		detectedSymptoms: ["demam", "batuk"],
		duration: "3 hari",
		severityLevel: SeverityLevel.MEDIUM,
		possibleCategory: "keluhan pernapasan",
		urgencyLevel: UrgencyLevel.NORMAL,
		doctorNoteSuggestion: "Evaluasi klinis.",
		confidenceScore: decimal,
		modelVersion: "dummy-v1",
	},
	review: null,
};

function createRepository(
	overrides: Partial<DoctorConsultationRepository> = {},
): DoctorConsultationRepository {
	return {
		findMany: async () => [],
		count: async () => 0,
		findAccessibleDetail: async () => null,
		claim: async () => ({ kind: "not_found" }),
		createReview: async () => ({ kind: "not_found" }),
		close: async () => ({ kind: "not_found" }),
		...overrides,
	} as DoctorConsultationRepository;
}

describe("DoctorConsultationService list", () => {
	test("applies scope, ownership identity, status, pagination, and safe mapping", async () => {
		const findMany = mock(async () => [listRecord]);
		const count = mock(async () => 11);
		const service = new DoctorConsultationService(
			createRepository({ findMany, count }),
		);

		const result = await service.list(doctorId, {
			scope: "mine",
			status: ConsultationStatus.REVIEWED,
			page: 2,
			limit: 5,
		});

		expect(findMany).toHaveBeenCalledWith({
			doctorId,
			scope: "mine",
			status: ConsultationStatus.REVIEWED,
			skip: 5,
			take: 5,
		});
		expect(result.pagination).toEqual({
			page: 2,
			limit: 5,
			total: 11,
			total_pages: 3,
		});
		expect(result.items[0]).toMatchObject({
			complaint_text: `${"a".repeat(100)}...`,
			ai_summary: "Ringkasan aman untuk dokter.",
			possible_category: "keluhan pernapasan",
			urgency_level: "normal",
			confidence_score: 0.82,
		});
		expect(JSON.stringify(result)).not.toContain("rawOutput");
		expect(JSON.stringify(result)).not.toContain("processingTimeMs");
	});
});

describe("DoctorConsultationService detail", () => {
	test("maps full safe AI data for an accessible consultation", async () => {
		const findAccessibleDetail = mock(async () => detailRecord);
		const service = new DoctorConsultationService(
			createRepository({ findAccessibleDetail }),
		);

		const result = await service.getDetail(consultationId, doctorId);

		expect(findAccessibleDetail).toHaveBeenCalledWith(consultationId, doctorId);
		expect(result.ai_analysis).toMatchObject({
			detected_symptoms: ["demam", "batuk"],
			severity_level: "medium",
			urgency_level: "normal",
			confidence_score: 0.82,
			model_version: "dummy-v1",
		});
		expect(JSON.stringify(result)).not.toContain("rawOutput");
		expect(JSON.stringify(result)).not.toContain("processingTimeMs");
	});

	test("returns the same 404 for missing or inaccessible consultations", async () => {
		const service = new DoctorConsultationService(createRepository());

		await expect(
			service.getDetail(consultationId, otherDoctorId),
		).rejects.toMatchObject({ statusCode: 404 });
	});
});

describe("DoctorConsultationService claim", () => {
	test("returns IN_REVIEW assignment from an atomic claim", async () => {
		const claim = mock(async () => ({
			kind: "success" as const,
			value: {
				id: consultationId,
				doctorId,
				status: ConsultationStatus.IN_REVIEW,
				assignedAt: now,
			},
		}));
		const service = new DoctorConsultationService(
			createRepository({ claim }),
			() => now,
		);

		expect(await service.claim(consultationId, doctorId)).toEqual({
			consultation: {
				id: consultationId,
				doctor_id: doctorId,
				status: "in_review",
				assigned_at: now.toISOString(),
			},
		});
		expect(claim).toHaveBeenCalledWith(consultationId, doctorId, now);
	});

	test("only one of two Doctors can claim the same consultation", async () => {
		let claimedBy: string | null = null;
		const claim = mock(async (_id: string, attemptedDoctorId: string) => {
			if (claimedBy !== null) return { kind: "conflict" as const };
			claimedBy = attemptedDoctorId;
			return {
				kind: "success" as const,
				value: {
					id: consultationId,
					doctorId: attemptedDoctorId,
					status: ConsultationStatus.IN_REVIEW,
					assignedAt: now,
				},
			};
		});
		const service = new DoctorConsultationService(
			createRepository({ claim }),
			() => now,
		);

		const results = await Promise.allSettled([
			service.claim(consultationId, doctorId),
			service.claim(consultationId, otherDoctorId),
		]);

		expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
		expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
	});

	test.each([
		["not_found", 404],
		["conflict", 409],
	] as const)("maps %s claim result", async (kind, statusCode) => {
		const service = new DoctorConsultationService(
			createRepository({ claim: async () => ({ kind }) }),
		);
		await expect(service.claim(consultationId, doctorId)).rejects.toMatchObject({
			statusCode,
		});
	});
});

describe("DoctorConsultationService review and close", () => {
	test("creates one review and reports REVIEWED", async () => {
		const createReview = mock(async () => ({
			kind: "success" as const,
			value: reviewRecord,
		}));
		const service = new DoctorConsultationService(
			createRepository({ createReview }),
			() => now,
		);
		const input = {
			review_note: reviewRecord.reviewNote,
			final_category: reviewRecord.finalCategory,
			final_urgency_level: UrgencyLevel.NORMAL,
			recommendation: reviewRecord.recommendation,
		};

		const result = await service.review(consultationId, doctorId, input);

		expect(result.consultation_status).toBe("reviewed");
		expect(result.review).toMatchObject({
			review_note: reviewRecord.reviewNote,
			final_urgency_level: "normal",
		});
		expect(createReview).toHaveBeenCalledTimes(1);
	});

	test.each([
		["not_found", 404],
		["conflict", 409],
	] as const)("maps %s review result", async (kind, statusCode) => {
		const service = new DoctorConsultationService(
			createRepository({ createReview: async () => ({ kind }) }),
		);
		await expect(
			service.review(consultationId, doctorId, { review_note: "Valid" }),
		).rejects.toMatchObject({ statusCode });
	});

	test("closes only a successful reviewed consultation result", async () => {
		const close = mock(async () => ({
			kind: "success" as const,
			value: {
				id: consultationId,
				status: ConsultationStatus.CLOSED,
				closedAt: now,
			},
		}));
		const service = new DoctorConsultationService(
			createRepository({ close }),
			() => now,
		);

		expect(await service.close(consultationId, doctorId)).toEqual({
			consultation: {
				id: consultationId,
				status: "closed",
				closed_at: now.toISOString(),
			},
		});
	});

	test.each([
		["not_found", 404],
		["conflict", 409],
	] as const)("maps %s close result", async (kind, statusCode) => {
		const service = new DoctorConsultationService(
			createRepository({ close: async () => ({ kind }) }),
		);
		await expect(service.close(consultationId, doctorId)).rejects.toMatchObject({
			statusCode,
		});
	});
});
