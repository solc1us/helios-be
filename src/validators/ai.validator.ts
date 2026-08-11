import { z } from "zod";

import type { AiModelOutput, ValidatedAiModelOutput } from "../types/ai.type";

const optionalNonEmptyString = z.string().trim().min(1).nullable().optional();

export const aiModelOutputSchema: z.ZodType<AiModelOutput> = z
	.object({
		summary: z.string().trim().min(1),
		detected_symptoms: z.array(z.string().trim().min(1)),
		duration: optionalNonEmptyString,
		severity_level: z.enum(["low", "medium", "high"]),
		possible_category: z.string().trim().min(1),
		urgency_level: z.enum(["normal", "priority", "urgent"]),
		doctor_note_suggestion: optionalNonEmptyString,
		confidence_score: z.number().finite().min(0).max(1),
		model_version: z.string().trim().min(1),
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
