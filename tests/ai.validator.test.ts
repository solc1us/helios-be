import { describe, expect, test } from "bun:test";

import { DUMMY_AI_OUTPUT } from "../src/adapters/dummyAiModel.adapter";
import { aiModelOutputSchema } from "../src/validators/ai.validator";

describe("AI model output validation", () => {
	test("accepts the valid dummy output", () => {
		expect(aiModelOutputSchema.safeParse(DUMMY_AI_OUTPUT).success).toBe(true);
	});

	test("rejects missing required fields", () => {
		const { summary: _summary, ...withoutSummary } = DUMMY_AI_OUTPUT;

		expect(aiModelOutputSchema.safeParse(withoutSummary).success).toBe(false);
	});

	test.each([
		["severity_level", "critical"],
		["urgency_level", "immediate"],
		["confidence_score", -0.01],
		["confidence_score", 1.01],
		["detected_symptoms", ["demam", 10]],
		["summary", ""],
		["possible_category", "   "],
		["model_version", ""],
	] as const)("rejects invalid %s", (field, value) => {
		expect(
			aiModelOutputSchema.safeParse({
				...DUMMY_AI_OUTPUT,
				[field]: value,
			}).success,
		).toBe(false);
	});
});
