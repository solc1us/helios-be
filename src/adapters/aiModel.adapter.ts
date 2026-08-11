import type { AiModelInput, AiModelOutput } from "../types/ai.type";

export interface AiModelAdapter {
	analyzeComplaint(input: AiModelInput): Promise<AiModelOutput>;
}
