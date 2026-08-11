import { describe, expect, mock, test } from "bun:test";

import { ConsultationStatus } from "../src/generated/prisma/enums";

import type {
	ConsultationRecord,
	ConsultationRepository,
	DecimalValue,
	PatientConsultationListRecord,
	PatientDashboardStatisticsRecord,
} from "../src/repositories/consultation.repository";
import {
	buildDashboardStatistics,
	ConsultationService,
	createComplaintPreview,
} from "../src/services/consultation.service";

const createdAt = new Date("2026-08-11T10:00:00.000Z");
const updatedAt = new Date("2026-08-11T10:05:00.000Z");

const consultation: ConsultationRecord = {
	id: "061af019-5542-49f6-978a-78b819c6be3d",
	complaintText: "Saya demam dan batuk sejak tiga hari yang lalu.",
	status: ConsultationStatus.SUBMITTED,
	doctorId: null,
	createdAt,
	updatedAt,
};

function decimal(value: number): DecimalValue {
	return { toNumber: () => value };
}

const listConsultation: PatientConsultationListRecord = {
	id: consultation.id,
	complaintText: consultation.complaintText,
	status: consultation.status,
	createdAt: consultation.createdAt,
	review: null,
	aiAnalysis: null,
};

function createService(
	overrides: Partial<ConsultationRepository> = {},
	now: () => Date = () => new Date("2026-08-11T10:00:00.000Z"),
) {
	const repository = {
		createForPatient: async () => consultation,
		findManyByPatient: async () => [],
		countByPatient: async () => 0,
		countCurrentMonthByPatient: async () => 0,
		findDashboardStatisticsByPatient: async () => [],
		findByIdAndPatient: async () => null,
		...overrides,
	} as ConsultationRepository;

	return new ConsultationService(repository, now);
}

describe("ConsultationService creation", () => {
	test("uses the authenticated patient ID and returns submitted status", async () => {
		const createForPatient = mock(async () => consultation);
		const service = createService({ createForPatient });

		const result = await service.createForPatient("authenticated-patient", {
			complaint_text: consultation.complaintText,
		});

		expect(createForPatient).toHaveBeenCalledWith(
			"authenticated-patient",
			consultation.complaintText,
		);
		expect(result.consultation.status).toBe("submitted");
		expect(result.consultation).not.toHaveProperty("patientId");
		expect(result.consultation).not.toHaveProperty("doctorId");
	});
});

describe("ConsultationService listing", () => {
	test("applies ownership, status, pagination, and preserves newest-first results", async () => {
		const older = {
			...listConsultation,
			id: "061af019-5542-49f6-978a-78b819c6be3e",
			createdAt: new Date("2026-08-10T10:00:00.000Z"),
		};
		const findManyByPatient = mock(async () => [listConsultation, older]);
		const countByPatient = mock(async () => 12);
		const service = createService({ findManyByPatient, countByPatient });

		const result = await service.listForPatient("authenticated-patient", {
			status: ConsultationStatus.SUBMITTED,
			page: 2,
			limit: 5,
		});

		expect(findManyByPatient).toHaveBeenCalledWith({
			patientId: "authenticated-patient",
			status: ConsultationStatus.SUBMITTED,
			skip: 5,
			take: 5,
		});
		expect(countByPatient).toHaveBeenCalledWith({
			patientId: "authenticated-patient",
			status: ConsultationStatus.SUBMITTED,
		});
		expect(result.items.map((item) => item.id)).toEqual([
			listConsultation.id,
			older.id,
		]);
		expect(result.pagination).toEqual({
			page: 2,
			limit: 5,
			total: 12,
			total_pages: 3,
		});
		expect(result.statistics).toEqual({
			this_month: 0,
			best_confidence: null,
			top_diagnosis: null,
			distribution: {},
		});
	});

	test("generates complaint previews consistently", () => {
		expect(createComplaintPreview("a".repeat(100))).toBe("a".repeat(100));
		expect(createComplaintPreview("a".repeat(101))).toBe(
			`${"a".repeat(100)}...`,
		);
	});

	test("maps only doctor-reviewed category and confidence fields", async () => {
		const reviewed: PatientConsultationListRecord = {
			...listConsultation,
			status: ConsultationStatus.REVIEWED,
			complaintText: "a".repeat(101),
			review: { finalCategory: "keluhan pernapasan" },
			aiAnalysis: { confidenceScore: decimal(0.82) },
		};
		const unreviewed: PatientConsultationListRecord = {
			...listConsultation,
			id: "unreviewed",
			status: ConsultationStatus.ANALYZED,
			review: { finalCategory: "kategori belum dikonfirmasi" },
			aiAnalysis: { confidenceScore: decimal(0.99) },
		};
		const reviewedWithoutAnalysis: PatientConsultationListRecord = {
			...reviewed,
			id: "without-analysis",
			review: { finalCategory: null },
			aiAnalysis: null,
		};
		const service = createService({
			findManyByPatient: async () => [
				reviewed,
				unreviewed,
				reviewedWithoutAnalysis,
			],
		});

		const result = await service.listForPatient("patient-id", {
			page: 1,
			limit: 10,
		});

		expect(result.items[0]).toMatchObject({
			complaint_text: `${"a".repeat(100)}...`,
			category: "keluhan pernapasan",
			confidence_score: 0.82,
		});
		expect(result.items[1]).toMatchObject({
			category: null,
			confidence_score: null,
		});
		expect(result.items[2]).toMatchObject({
			category: null,
			confidence_score: null,
		});
		expect(result.items[0]).not.toHaveProperty("complaint_preview");
		expect(result.items[0]).not.toHaveProperty("aiAnalysis");
	});

	test("keeps dashboard statistics independent from status and pagination", async () => {
		const countCurrentMonthByPatient = mock(async () => 4);
		const findDashboardStatisticsByPatient = mock(async () => []);
		const service = createService({
			countCurrentMonthByPatient,
			findDashboardStatisticsByPatient,
		});

		const result = await service.listForPatient("authenticated-patient", {
			status: ConsultationStatus.SUBMITTED,
			page: 3,
			limit: 5,
		});

		expect(countCurrentMonthByPatient).toHaveBeenCalledWith(
			"authenticated-patient",
			new Date("2026-08-01T00:00:00.000Z"),
			new Date("2026-09-01T00:00:00.000Z"),
		);
		expect(findDashboardStatisticsByPatient).toHaveBeenCalledWith(
			"authenticated-patient",
		);
		expect(result.statistics.this_month).toBe(4);
	});

	test("returns a complete empty dashboard state", async () => {
		const service = createService();

		const result = await service.listForPatient("patient-id", {
			page: 1,
			limit: 10,
		});

		expect(result).toEqual({
			items: [],
			pagination: { page: 1, limit: 10, total: 0, total_pages: 0 },
			statistics: {
				this_month: 0,
				best_confidence: null,
				top_diagnosis: null,
				distribution: {},
			},
		});
	});
});

describe("ConsultationService dashboard statistics", () => {
	test("uses reviewed final categories and the highest reviewed confidence", () => {
		const records: PatientDashboardStatisticsRecord[] = [
			{
				status: ConsultationStatus.REVIEWED,
				review: { finalCategory: "keluhan pernapasan" },
				aiAnalysis: { confidenceScore: decimal(0.82) },
			},
			{
				status: ConsultationStatus.CLOSED,
				review: { finalCategory: "keluhan pencernaan" },
				aiAnalysis: { confidenceScore: decimal(0.87) },
			},
			{
				status: ConsultationStatus.REVIEWED,
				review: { finalCategory: "keluhan pernapasan" },
				aiAnalysis: { confidenceScore: decimal(0.75) },
			},
			{
				status: ConsultationStatus.REVIEWED,
				review: { finalCategory: null },
				aiAnalysis: null,
			},
			{
				status: ConsultationStatus.ANALYZED,
				review: { finalCategory: "kategori AI tidak boleh dipakai" },
				aiAnalysis: { confidenceScore: decimal(0.99) },
			},
		];

		expect(buildDashboardStatistics(4, records)).toEqual({
			this_month: 4,
			best_confidence: 0.87,
			top_diagnosis: "keluhan pernapasan",
			distribution: {
				"keluhan pencernaan": 1,
				"keluhan pernapasan": 2,
			},
		});
	});

	test("breaks equal category counts alphabetically and ignores null categories", () => {
		const records: PatientDashboardStatisticsRecord[] = [
			{
				status: ConsultationStatus.REVIEWED,
				review: { finalCategory: "zebra" },
				aiAnalysis: null,
			},
			{
				status: ConsultationStatus.CLOSED,
				review: { finalCategory: "alpha" },
				aiAnalysis: null,
			},
			{
				status: ConsultationStatus.REVIEWED,
				review: { finalCategory: null },
				aiAnalysis: { confidenceScore: decimal(0.5) },
			},
		];

		const result = buildDashboardStatistics(0, records);

		expect(result.top_diagnosis).toBe("alpha");
		expect(result.distribution).toEqual({ alpha: 1, zebra: 1 });
		expect(result.best_confidence).toBe(0.5);
	});

	test("returns null confidence and diagnosis when reviewed data is unavailable", () => {
		expect(buildDashboardStatistics(0, [])).toEqual({
			this_month: 0,
			best_confidence: null,
			top_diagnosis: null,
			distribution: {},
		});
	});
});

describe("ConsultationService detail", () => {
	test("returns an owned consultation without AI analysis", async () => {
		const lookup = mock(async () => consultation);
		const service = createService({ findByIdAndPatient: lookup });

		const result = await service.getDetailForPatient(
			consultation.id,
			"authenticated-patient",
		);

		expect(lookup).toHaveBeenCalledWith(
			consultation.id,
			"authenticated-patient",
		);
		expect(result.doctor_review).toBeNull();
		expect(result).not.toHaveProperty("ai_analysis");
		expect(result.consultation.updated_at).toBe(updatedAt.toISOString());
	});

	test("returns 404 when an owned consultation is not found", async () => {
		const service = createService();

		expect(
			service.getDetailForPatient(
				consultation.id,
				"authenticated-patient",
			),
		).rejects.toMatchObject({
			statusCode: 404,
			message: "Konsultasi tidak ditemukan.",
		});
	});

	test("uses the same 404 when the ownership-scoped repository returns null", async () => {
		const lookup = mock(async () => null);
		const service = createService({ findByIdAndPatient: lookup });

		expect(
			service.getDetailForPatient(consultation.id, "other-patient"),
		).rejects.toMatchObject({ statusCode: 404 });
		expect(lookup).toHaveBeenCalledWith(consultation.id, "other-patient");
	});
});
