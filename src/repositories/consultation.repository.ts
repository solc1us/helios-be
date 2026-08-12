import {
	ConsultationStatus,
	type UrgencyLevel,
} from "../generated/prisma/enums";

import { prisma } from "../config/database.config";

export interface ConsultationRecord {
	id: string;
	complaintText: string;
	status: ConsultationStatus;
	doctorId: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface PatientConsultationDetailRecord extends ConsultationRecord {
	reviewedAt: Date | null;
	review: {
		finalCategory: string | null;
		finalUrgencyLevel: UrgencyLevel | null;
		recommendation: string | null;
	} | null;
}

export interface DecimalValue {
	toNumber(): number;
}

export interface PatientConsultationListRecord {
	id: string;
	complaintText: string;
	status: ConsultationStatus;
	createdAt: Date;
	review: { finalCategory: string | null } | null;
	aiAnalysis: { confidenceScore: DecimalValue } | null;
}

export interface PatientDashboardStatisticsRecord {
	status: ConsultationStatus;
	review: { finalCategory: string | null } | null;
	aiAnalysis: { confidenceScore: DecimalValue } | null;
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

const patientListSelect = {
	id: true,
	complaintText: true,
	status: true,
	createdAt: true,
	review: {
		select: { finalCategory: true },
	},
	aiAnalysis: {
		select: { confidenceScore: true },
	},
} as const;

const reviewedStatuses = [
	ConsultationStatus.REVIEWED,
	ConsultationStatus.CLOSED,
];

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
	): Promise<PatientConsultationListRecord[]> {
		return prisma.consultation.findMany({
			where: patientFilter(options),
			orderBy: { createdAt: "desc" },
			skip: options.skip,
			take: options.take,
			select: patientListSelect,
		});
	},

	countByPatient(options: CountByPatientOptions): Promise<number> {
		return prisma.consultation.count({ where: patientFilter(options) });
	},

	countCurrentMonthByPatient(
		patientId: string,
		monthStart: Date,
		nextMonthStart: Date,
	): Promise<number> {
		return prisma.consultation.count({
			where: {
				patientId,
				createdAt: { gte: monthStart, lt: nextMonthStart },
			},
		});
	},

	findDashboardStatisticsByPatient(
		patientId: string,
	): Promise<PatientDashboardStatisticsRecord[]> {
		return prisma.consultation.findMany({
			where: {
				patientId,
				status: { in: reviewedStatuses },
			},
			select: {
				status: true,
				review: {
					select: { finalCategory: true },
				},
				aiAnalysis: {
					select: { confidenceScore: true },
				},
			},
		});
	},

	findByIdAndPatient(
		id: string,
		patientId: string,
	): Promise<PatientConsultationDetailRecord | null> {
		return prisma.consultation.findFirst({
			where: { id, patientId },
			select: {
				...consultationSelect,
				reviewedAt: true,
				review: {
					select: {
						finalCategory: true,
						finalUrgencyLevel: true,
						recommendation: true,
					},
				},
			},
		});
	},
};

export type ConsultationRepository = typeof consultationRepository;
