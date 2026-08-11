import type { AiModelAdapter } from "../adapters/aiModel.adapter";
import { dummyAiModelAdapter } from "../adapters/dummyAiModel.adapter";
import {
	aiAnalysisRepository,
	type AiAnalysisRepository,
} from "../repositories/aiAnalysis.repository";
import {
	SeverityLevel,
	UrgencyLevel,
} from "../generated/prisma/enums";
import type { ValidatedAiModelOutput } from "../types/ai.type";
import { AppError } from "../utils/app-error";
import { validateAiModelOutput } from "../validators/ai.validator";

const severityLevels = {
	low: SeverityLevel.LOW,
	medium: SeverityLevel.MEDIUM,
	high: SeverityLevel.HIGH,
} as const;

const urgencyLevels = {
	normal: UrgencyLevel.NORMAL,
	priority: UrgencyLevel.PRIORITY,
	urgent: UrgencyLevel.URGENT,
} as const;

export interface ConsultationProcessor {
	processConsultation(consultationId: string): Promise<ValidatedAiModelOutput>;
}

export class AiProcessingService implements ConsultationProcessor {
	constructor(
		private readonly repository: AiAnalysisRepository = aiAnalysisRepository,
		private readonly adapter: AiModelAdapter = dummyAiModelAdapter,
		private readonly nowMs: () => number = () => performance.now(),
	) {}

	async processConsultation(
		consultationId: string,
	): Promise<ValidatedAiModelOutput> {
		const consultation =
			await this.repository.claimForProcessing(consultationId);

		if (!consultation) {
			throw new AppError(409, "Konsultasi tidak dapat diproses.");
		}

		try {
			const startedAt = this.nowMs();
			const rawOutput = await this.adapter.analyzeComplaint({
				complaintText: consultation.complaintText,
			});
			const processingTimeMs = Math.max(
				0,
				Math.round(this.nowMs() - startedAt),
			);
			const output = validateAiModelOutput(rawOutput);

			await this.repository.completeProcessing(consultationId, {
				summary: output.summary,
				detectedSymptoms: output.detected_symptoms,
				duration: output.duration,
				severityLevel: severityLevels[output.severity_level],
				possibleCategory: output.possible_category,
				urgencyLevel: urgencyLevels[output.urgency_level],
				doctorNoteSuggestion: output.doctor_note_suggestion,
				confidenceScore: output.confidence_score,
				modelVersion: output.model_version,
				processingTimeMs,
				rawOutput: {
					...output,
					detected_symptoms: [...output.detected_symptoms],
				},
			});

			return output;
		} catch {
			try {
				await this.repository.failProcessing(consultationId);
			} catch {
				// Preserve the safe application error even if failure persistence also fails.
			}

			throw new AppError(500, "Analisis konsultasi gagal diproses.");
		}
	}
}

export const aiProcessingService = new AiProcessingService();
