export interface AiModelInput {
	complaintText: string;
}

export interface AiModelOutput {
	summary: string;
	detected_symptoms: string[];
	duration?: string | null;
	severity_level: "low" | "medium" | "high";
	possible_category: string;
	urgency_level: "normal" | "priority" | "urgent";
	doctor_note_suggestion?: string | null;
	confidence_score: number;
	model_version: string;
}

export interface ValidatedAiModelOutput extends AiModelOutput {
	duration: string | null;
	doctor_note_suggestion: string | null;
}
