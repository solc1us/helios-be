import type { AccountStatus } from "../generated/prisma/enums";
import { prisma } from "../config/database.config";

export interface DoctorCredentialRecord {
	id: string;
	name: string;
	email: string;
	specialization: string | null;
	licenseNumber: string;
	passwordHash: string;
	status: AccountStatus;
}

export interface DoctorPublicRecord {
	id: string;
	name: string;
	email: string;
	specialization: string | null;
	licenseNumber: string;
	status: AccountStatus;
}

export const doctorRepository = {
	findById(id: string): Promise<DoctorPublicRecord | null> {
		return prisma.doctor.findUnique({
			where: { id },
			select: {
				id: true,
				name: true,
				email: true,
				specialization: true,
				licenseNumber: true,
				status: true,
			},
		});
	},

	findByEmail(email: string): Promise<DoctorCredentialRecord | null> {
		return prisma.doctor.findUnique({
			where: { email },
			select: {
				id: true,
				name: true,
				email: true,
				specialization: true,
				licenseNumber: true,
				passwordHash: true,
				status: true,
			},
		});
	},
};

export type DoctorRepository = typeof doctorRepository;
