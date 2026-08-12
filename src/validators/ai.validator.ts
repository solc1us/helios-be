import { z } from "zod";

import type { AiModelOutput, ValidatedAiModelOutput } from "../types/ai.type";

const optionalShortString = z.string().trim().min(1).max(255).nullable().optional();
const optionalLongString = z.string().trim().min(1).max(5000).nullable().optional();

export const aiModelOutputSchema: z.ZodType<AiModelOutput> = z
	.object({
		summary: z.string().trim().min(1).max(10_000),
		detected_symptoms: z.array(z.string().trim().min(1).max(255)).max(100),
		duration: optionalShortString,
		severity_level: z.enum(["low", "medium", "high"]),
		possible_category: z.string().trim().min(1).max(255),
		urgency_level: z.enum(["normal", "priority", "urgent"]),
		doctor_note_suggestion: optionalLongString,
		confidence_score: z.number().finite().min(0).max(1),
		model_version: z.string().trim().min(1).max(100),
	})
	.strict();

export function validateAiModelOutput(output: unknown): ValidatedAiModelOutput {
	const validated = aiModelOutputSchema.parse(output);

	return {
		...validated,
		duration: validated.duration ?? null,
		doctor_note_suggestion: validated.doctor_note_suggestion ?? null,
	};
}
