import { AccountStatus } from "../generated/prisma/enums";
import type { RequestHandler } from "express";

import { ROLES } from "../constants/roles";
import { adminRepository } from "../repositories/admin.repository";
import { doctorRepository } from "../repositories/doctor.repository";
import { patientRepository } from "../repositories/patient.repository";
import { AppError } from "../utils/app-error";

interface AccountStatusRecord {
	status: AccountStatus;
}

export interface ActiveAccountDependencies {
	findPatientById(id: string): Promise<AccountStatusRecord | null>;
	findDoctorById(id: string): Promise<AccountStatusRecord | null>;
	findAdminById(id: string): Promise<AccountStatusRecord | null>;
}

const defaultDependencies: ActiveAccountDependencies = {
	findPatientById: (id) => patientRepository.findById(id),
	findDoctorById: (id) => doctorRepository.findById(id),
	findAdminById: (id) => adminRepository.findById(id),
};

export function createActiveAccountMiddleware(
	dependencies: ActiveAccountDependencies = defaultDependencies,
): RequestHandler {
	return async (req, _res, next) => {
		if (!req.auth) {
			next(new AppError(401, "Autentikasi diperlukan."));
			return;
		}

		const account = await (() => {
			switch (req.auth!.role) {
				case ROLES.PATIENT:
					return dependencies.findPatientById(req.auth!.id);
				case ROLES.DOCTOR:
					return dependencies.findDoctorById(req.auth!.id);
				case ROLES.ADMIN:
					return dependencies.findAdminById(req.auth!.id);
			}
		})();

		if (!account) {
			next(new AppError(401, "Token autentikasi tidak valid."));
			return;
		}

		if (account.status !== AccountStatus.ACTIVE) {
			next(new AppError(403, "Akun tidak aktif."));
			return;
		}

		next();
	};
}

export const activeAccountMiddleware = createActiveAccountMiddleware();
