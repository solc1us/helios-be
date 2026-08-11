import type { AccountStatus } from "../generated/prisma/enums";
import { prisma } from "../config/database.config";

export interface AdminCredentialRecord {
	id: string;
	name: string;
	email: string;
	passwordHash: string;
	status: AccountStatus;
}

export interface AdminPublicRecord {
	id: string;
	name: string;
	email: string;
	status: AccountStatus;
}

export const adminRepository = {
	findById(id: string): Promise<AdminPublicRecord | null> {
		return prisma.admin.findUnique({
			where: { id },
			select: { id: true, name: true, email: true, status: true },
		});
	},

	findByEmail(email: string): Promise<AdminCredentialRecord | null> {
		return prisma.admin.findUnique({
			where: { email },
			select: {
				id: true,
				name: true,
				email: true,
				passwordHash: true,
				status: true,
			},
		});
	},
};

export type AdminRepository = typeof adminRepository;
