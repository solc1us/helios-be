import { describe, expect, mock, test } from "bun:test";

import type { AiModelAdapter } from "../src/adapters/aiModel.adapter";
import { DUMMY_AI_OUTPUT } from "../src/adapters/dummyAiModel.adapter";
import {
	ConsultationStatus,
	SeverityLevel,
	UrgencyLevel,
} from "../src/generated/prisma/enums";
import type {
	AiAnalysisPersistenceInput,
	AiAnalysisRepository,
} from "../src/repositories/aiAnalysis.repository";
import { AiProcessingService } from "../src/services/aiProcessing.service";
import type { AiModelOutput } from "../src/types/ai.type";

const consultationId = "061af019-5542-49f6-978a-78b819c6be3d";
const complaintText = "Saya demam dan batuk sejak tiga hari yang lalu.";

function createHarness(
	initialStatus: ConsultationStatus = ConsultationStatus.SUBMITTED,
	adapterOutput: AiModelOutput = DUMMY_AI_OUTPUT,
) {
	let status = initialStatus;
	const transitions: string[] = [];
	const analyses: AiAnalysisPersistenceInput[] = [];
	const analyzeComplaint = mock(async () => adapterOutput);
	const adapter: AiModelAdapter = { analyzeComplaint };
	const repository: AiAnalysisRepository = {
		async claimForProcessing(id) {
			if (id !== consultationId || status !== ConsultationStatus.SUBMITTED) {
				return null;
			}

			transitions.push("SUBMITTED->PROCESSING");
			status = ConsultationStatus.PROCESSING;

			return { id: consultationId, complaintText };
		},
		async completeProcessing(id, analysis) {
			if (id !== consultationId || status !== ConsultationStatus.PROCESSING) {
				throw new Error("not processing");
			}

			analyses.push(analysis);
			transitions.push("PROCESSING->ANALYZED");
			status = ConsultationStatus.ANALYZED;
		},
		async failProcessing(id) {
			if (id === consultationId && status === ConsultationStatus.PROCESSING) {
				transitions.push("PROCESSING->FAILED");
				status = ConsultationStatus.FAILED;
			}
		},
	};
	const times = [100, 107];
	const service = new AiProcessingService(
		repository,
		adapter,
		() => times.shift() ?? 107,
	);

	return {
		service,
		analyzeComplaint,
		analyses,
		transitions,
		getStatus: () => status,
	};
}

describe("AiProcessingService success", () => {
	test("claims, validates, persists, and completes a submitted consultation", async () => {
		const harness = createHarness();

		const result = await harness.service.processConsultation(consultationId);

		expect(harness.transitions).toEqual([
			"SUBMITTED->PROCESSING",
			"PROCESSING->ANALYZED",
		]);
		expect(harness.getStatus()).toBe(ConsultationStatus.ANALYZED);
		expect(harness.analyzeComplaint).toHaveBeenCalledTimes(1);
		expect(harness.analyzeComplaint).toHaveBeenCalledWith({ complaintText });
		expect(harness.analyses).toHaveLength(1);
		expect(harness.analyses[0]).toMatchObject({
			detectedSymptoms: ["demam", "batuk"],
			severityLevel: SeverityLevel.MEDIUM,
			urgencyLevel: UrgencyLevel.NORMAL,
			confidenceScore: 0.82,
			modelVersion: "dummy-v1",
			processingTimeMs: 7,
		});
		expect(harness.analyses[0]?.rawOutput).toEqual({ ...result });
	});
});

describe("AiProcessingService failure", () => {
	test("marks the consultation failed when the adapter throws", async () => {
		const harness = createHarness();
		harness.analyzeComplaint.mockImplementation(async () => {
			throw new Error("internal model detail");
		});

		await expect(
			harness.service.processConsultation(consultationId),
		).rejects.toMatchObject({
			statusCode: 500,
			message: "Analisis konsultasi gagal diproses.",
		});
		expect(harness.getStatus()).toBe(ConsultationStatus.FAILED);
		expect(harness.analyses).toHaveLength(0);
	});

	test("marks the consultation failed when adapter output is invalid", async () => {
		const harness = createHarness(ConsultationStatus.SUBMITTED, {
			...DUMMY_AI_OUTPUT,
			confidence_score: 2,
		});

		await expect(
			harness.service.processConsultation(consultationId),
		).rejects.toMatchObject({ statusCode: 500 });
		expect(harness.transitions).toEqual([
			"SUBMITTED->PROCESSING",
			"PROCESSING->FAILED",
		]);
		expect(harness.analyses).toHaveLength(0);
	});
});

describe("AiProcessingService duplicate protection", () => {
	test("allows only one concurrent claim for the same submitted consultation", async () => {
		const harness = createHarness();

		const results = await Promise.allSettled([
			harness.service.processConsultation(consultationId),
			harness.service.processConsultation(consultationId),
		]);

		expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(
			1,
		);
		expect(results.filter((result) => result.status === "rejected")).toHaveLength(
			1,
		);
		expect(harness.analyzeComplaint).toHaveBeenCalledTimes(1);
		expect(harness.analyses).toHaveLength(1);
	});

	test.each([
		ConsultationStatus.PROCESSING,
		ConsultationStatus.ANALYZED,
		ConsultationStatus.FAILED,
	])("does not process an existing %s consultation", async (status) => {
		const harness = createHarness(status);

		await expect(
			harness.service.processConsultation(consultationId),
		).rejects.toMatchObject({ statusCode: 409 });
		expect(harness.getStatus()).toBe(status);
		expect(harness.analyzeComplaint).not.toHaveBeenCalled();
		expect(harness.analyses).toHaveLength(0);
	});
});
