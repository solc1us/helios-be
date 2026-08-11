import type { AiModelAdapter } from "./aiModel.adapter";
import type { AiModelInput, AiModelOutput } from "../types/ai.type";

export const DUMMY_AI_OUTPUT: Readonly<AiModelOutput> = {
	summary:
		"Pasien mengalami keluhan yang memerlukan evaluasi lebih lanjut oleh dokter.",
	detected_symptoms: ["demam", "batuk"],
	duration: "3 hari",
	severity_level: "medium",
	possible_category: "keluhan pernapasan",
	urgency_level: "normal",
	doctor_note_suggestion:
		"Disarankan melakukan evaluasi klinis lebih lanjut terhadap kondisi pasien.",
	confidence_score: 0.82,
	model_version: "dummy-v1",
};

export class DummyAiModelAdapter implements AiModelAdapter {
	async analyzeComplaint(_input: AiModelInput): Promise<AiModelOutput> {
		await Promise.resolve();

		return {
			...DUMMY_AI_OUTPUT,
			detected_symptoms: [...DUMMY_AI_OUTPUT.detected_symptoms],
		};
	}
}

export const dummyAiModelAdapter = new DummyAiModelAdapter();
