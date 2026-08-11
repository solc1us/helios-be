import { describe, expect, mock, test } from "bun:test";

import { ConsultationStatus } from "../src/generated/prisma/enums";

import type {
	ConsultationRecord,
	ConsultationRepository,
} from "../src/repositories/consultation.repository";
import {
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

function createService(overrides: Partial<ConsultationRepository> = {}) {
	const repository = {
		createForPatient: async () => consultation,
		findManyByPatient: async () => [],
		countByPatient: async () => 0,
		findByIdAndPatient: async () => null,
		...overrides,
	} as ConsultationRepository;

	return new ConsultationService(repository);
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
			...consultation,
			id: "061af019-5542-49f6-978a-78b819c6be3e",
			createdAt: new Date("2026-08-10T10:00:00.000Z"),
		};
		const findManyByPatient = mock(async () => [consultation, older]);
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
			consultation.id,
			older.id,
		]);
		expect(result.pagination).toEqual({
			page: 2,
			limit: 5,
			total: 12,
			total_pages: 3,
		});
	});

	test("generates complaint previews consistently", () => {
		expect(createComplaintPreview("a".repeat(100))).toBe("a".repeat(100));
		expect(createComplaintPreview("a".repeat(101))).toBe(
			`${"a".repeat(100)}...`,
		);
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
