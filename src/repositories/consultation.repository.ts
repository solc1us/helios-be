import { ConsultationStatus } from "../generated/prisma/enums";

import { prisma } from "../config/database.config";

export interface ConsultationRecord {
	id: string;
	complaintText: string;
	status: ConsultationStatus;
	doctorId: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface FindManyByPatientOptions {
	patientId: string;
	status?: ConsultationStatus;
	skip: number;
	take: number;
}

export interface CountByPatientOptions {
	patientId: string;
	status?: ConsultationStatus;
}

const consultationSelect = {
	id: true,
	complaintText: true,
	status: true,
	doctorId: true,
	createdAt: true,
	updatedAt: true,
} as const;

function patientFilter(options: CountByPatientOptions) {
	return {
		patientId: options.patientId,
		...(options.status === undefined ? {} : { status: options.status }),
	};
}

export const consultationRepository = {
	createForPatient(
		patientId: string,
		complaintText: string,
	): Promise<ConsultationRecord> {
		return prisma.consultation.create({
			data: {
				patientId,
				complaintText,
				doctorId: null,
				status: ConsultationStatus.SUBMITTED,
			},
			select: consultationSelect,
		});
	},

	findManyByPatient(
		options: FindManyByPatientOptions,
	): Promise<ConsultationRecord[]> {
		return prisma.consultation.findMany({
			where: patientFilter(options),
			orderBy: { createdAt: "desc" },
			skip: options.skip,
			take: options.take,
			select: consultationSelect,
		});
	},

	countByPatient(options: CountByPatientOptions): Promise<number> {
		return prisma.consultation.count({ where: patientFilter(options) });
	},

	findByIdAndPatient(
		id: string,
		patientId: string,
	): Promise<ConsultationRecord | null> {
		return prisma.consultation.findFirst({
			where: { id, patientId },
			select: consultationSelect,
		});
	},
};

export type ConsultationRepository = typeof consultationRepository;
