import {
	ActorType,
	ConsultationStatus,
	type SeverityLevel,
	type UrgencyLevel,
} from "../generated/prisma/enums";

import { prisma } from "../config/database.config";

export interface ProcessingConsultationRecord {
	id: string;
	complaintText: string;
}

export interface AiAnalysisPersistenceInput {
	summary: string;
	detectedSymptoms: string[];
	duration: string | null;
	severityLevel: SeverityLevel;
	possibleCategory: string;
	urgencyLevel: UrgencyLevel;
	doctorNoteSuggestion: string | null;
	confidenceScore: number;
	modelVersion: string;
	processingTimeMs: number;
	rawOutput: Record<string, string | number | string[] | null>;
}

export interface AiAnalysisRepository {
	claimForProcessing(
		consultationId: string,
	): Promise<ProcessingConsultationRecord | null>;
	completeProcessing(
		consultationId: string,
		analysis: AiAnalysisPersistenceInput,
	): Promise<void>;
	failProcessing(consultationId: string): Promise<void>;
}

export const aiAnalysisRepository: AiAnalysisRepository = {
	claimForProcessing(consultationId) {
		return prisma.$transaction(async (transaction) => {
			const claimed = await transaction.consultation.updateMany({
				where: {
					id: consultationId,
					status: ConsultationStatus.SUBMITTED,
				},
				data: { status: ConsultationStatus.PROCESSING },
			});

			if (claimed.count !== 1) return null;

			await transaction.auditLog.create({
				data: {
					actorType: ActorType.SYSTEM,
					actorId: null,
					consultationId,
					action: "AI_ANALYSIS_STARTED",
					description: "Pemrosesan analisis AI dimulai.",
				},
			});

			return transaction.consultation.findUniqueOrThrow({
				where: { id: consultationId },
				select: { id: true, complaintText: true },
			});
		});
	},

	async completeProcessing(consultationId, analysis) {
		await prisma.$transaction(async (transaction) => {
			const transitioned = await transaction.consultation.updateMany({
				where: {
					id: consultationId,
					status: ConsultationStatus.PROCESSING,
				},
				data: { status: ConsultationStatus.ANALYZED },
			});

			if (transitioned.count !== 1) {
				throw new Error("Consultation is no longer processing.");
			}

			await transaction.aiAnalysis.create({
				data: {
					consultationId,
					...analysis,
				},
			});

			await transaction.auditLog.create({
				data: {
					actorType: ActorType.SYSTEM,
					actorId: null,
					consultationId,
					action: "AI_ANALYSIS_COMPLETED",
					description: "Pemrosesan analisis AI selesai.",
				},
			});
		});
	},

	async failProcessing(consultationId) {
		await prisma.$transaction(async (transaction) => {
			const transitioned = await transaction.consultation.updateMany({
				where: {
					id: consultationId,
					status: ConsultationStatus.PROCESSING,
				},
				data: { status: ConsultationStatus.FAILED },
			});

			if (transitioned.count !== 1) return;

			await transaction.auditLog.create({
				data: {
					actorType: ActorType.SYSTEM,
					actorId: null,
					consultationId,
					action: "AI_ANALYSIS_FAILED",
					description: "Pemrosesan analisis AI gagal.",
				},
			});
		});
	},
};
