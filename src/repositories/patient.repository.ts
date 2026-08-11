import type { AccountStatus } from "../generated/prisma/enums";
import { prisma } from "../config/database.config";

export interface PatientCredentialRecord {
	id: string;
	name: string;
	email: string;
	phone: string;
	passwordHash: string;
	status: AccountStatus;
}

export interface PatientPublicRecord {
	id: string;
	name: string;
	email: string;
	phone: string;
	gender: string | null;
	birthDate: Date | null;
	status: AccountStatus;
}

export interface CreatePatientData {
	name: string;
	email: string;
	phone: string;
	passwordHash: string;
	gender?: string;
	birthDate?: Date;
}

const publicSelect = {
	id: true,
	name: true,
	email: true,
	phone: true,
	gender: true,
	birthDate: true,
	status: true,
} as const;

const credentialSelect = {
	id: true,
	name: true,
	email: true,
	phone: true,
	passwordHash: true,
	status: true,
} as const;

export const patientRepository = {
	findById(id: string): Promise<PatientPublicRecord | null> {
		return prisma.patient.findUnique({ where: { id }, select: publicSelect });
	},

	async findByEmail(email: string): Promise<{ id: string } | null> {
		return prisma.patient.findUnique({
			where: { email },
			select: { id: true },
		});
	},

	async findByPhone(phone: string): Promise<{ id: string } | null> {
		return prisma.patient.findUnique({
			where: { phone },
			select: { id: true },
		});
	},

	findByIdentifier(identifier: string): Promise<PatientCredentialRecord | null> {
		return prisma.patient.findFirst({
			where: {
				OR: [{ email: identifier }, { phone: identifier }],
			},
			select: credentialSelect,
		});
	},

	create(data: CreatePatientData): Promise<PatientPublicRecord> {
		return prisma.patient.create({ data, select: publicSelect });
	},
};

export type PatientRepository = typeof patientRepository;
