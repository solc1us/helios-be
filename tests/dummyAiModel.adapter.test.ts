import { describe, expect, test } from "bun:test";

import {
	DUMMY_AI_OUTPUT,
	DummyAiModelAdapter,
} from "../src/adapters/dummyAiModel.adapter";

describe("DummyAiModelAdapter", () => {
	test("accepts complaint input and returns deterministic dummy output", async () => {
		const adapter = new DummyAiModelAdapter();
		const first = await adapter.analyzeComplaint({
			complaintText: "Keluhan pertama yang valid.",
		});
		const second = await adapter.analyzeComplaint({
			complaintText: "Keluhan lain yang berbeda.",
		});

		expect(first).toEqual(DUMMY_AI_OUTPUT);
		expect(second).toEqual(DUMMY_AI_OUTPUT);
		expect(first.model_version).toBe("dummy-v1");
		expect(first).not.toBe(second);
		expect(first.detected_symptoms).not.toBe(second.detected_symptoms);
	});
});
