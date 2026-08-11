import { AccountStatus } from "../generated/prisma/enums";

import { ROLES } from "../constants/roles";
import {
	adminRepository,
	type AdminRepository,
} from "../repositories/admin.repository";
import {
	doctorRepository,
	type DoctorRepository,
} from "../repositories/doctor.repository";
import {
	patientRepository,
	type PatientRepository,
} from "../repositories/patient.repository";
import type {
	AccessTokenResult,
	AuthContext,
	EmailLoginInput,
	PatientLoginInput,
	PatientRegistrationInput,
} from "../types/auth.type";
import { AppError } from "../utils/app-error";
import { hashPassword, verifyPassword } from "../utils/password";
import { generateAccessToken } from "../utils/token";

interface AuthServiceDependencies {
	patients: PatientRepository;
	doctors: DoctorRepository;
	admins: AdminRepository;
	hashPassword: (password: string) => Promise<string>;
	verifyPassword: (password: string, passwordHash: string) => Promise<boolean>;
	generateAccessToken: (auth: AuthContext) => Promise<AccessTokenResult>;
}

const defaultDependencies: AuthServiceDependencies = {
	patients: patientRepository,
	doctors: doctorRepository,
	admins: adminRepository,
	hashPassword,
	verifyPassword,
	generateAccessToken,
};

function isUniqueConstraintError(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		error.code === "P2002"
	);
}

function inactiveAccountError(): AppError {
	return new AppError(403, "Akun tidak aktif.");
}

function invalidTokenAccountError(): AppError {
	return new AppError(401, "Token autentikasi tidak valid.");
}

export class AuthService {
	constructor(
		private readonly dependencies: AuthServiceDependencies = defaultDependencies,
	) {}

	async registerPatient(input: PatientRegistrationInput) {
		const [emailExists, phoneExists] = await Promise.all([
			this.dependencies.patients.findByEmail(input.email),
			this.dependencies.patients.findByPhone(input.phone),
		]);

		if (emailExists || phoneExists) {
			throw new AppError(409, "Email atau nomor telepon sudah terdaftar.");
		}

		const passwordHash = await this.dependencies.hashPassword(input.password);

		try {
			const patient = await this.dependencies.patients.create({
				name: input.name,
				email: input.email,
				phone: input.phone,
				passwordHash,
				...(input.gender === undefined ? {} : { gender: input.gender }),
				...(input.birth_date === undefined
					? {}
					: { birthDate: new Date(`${input.birth_date}T00:00:00.000Z`) }),
			});

			return {
				patient: {
					id: patient.id,
					name: patient.name,
					email: patient.email,
					phone: patient.phone,
					status: patient.status.toLowerCase(),
				},
			};
		} catch (error) {
			if (isUniqueConstraintError(error)) {
				throw new AppError(409, "Email atau nomor telepon sudah terdaftar.");
			}

			throw error;
		}
	}

	async loginPatient(input: PatientLoginInput) {
		const patient =
			await this.dependencies.patients.findByIdentifier(input.identifier);

		if (
			!patient ||
			!(await this.dependencies.verifyPassword(
				input.password,
				patient.passwordHash,
			))
		) {
			throw new AppError(
				401,
				"Email/nomor telepon atau password salah.",
			);
		}

		if (patient.status !== AccountStatus.ACTIVE) {
			throw inactiveAccountError();
		}

		const token = await this.dependencies.generateAccessToken({
			id: patient.id,
			role: ROLES.PATIENT,
		});

		return {
			access_token: token.accessToken,
			token_type: "Bearer" as const,
			expires_in: token.expiresIn,
			user: {
				id: patient.id,
				name: patient.name,
				email: patient.email,
				phone: patient.phone,
				role: ROLES.PATIENT,
			},
		};
	}

	async loginDoctor(input: EmailLoginInput) {
		const doctor = await this.dependencies.doctors.findByEmail(input.email);

		if (
			!doctor ||
			!(await this.dependencies.verifyPassword(
				input.password,
				doctor.passwordHash,
			))
		) {
			throw new AppError(401, "Email atau password salah.");
		}

		if (doctor.status !== AccountStatus.ACTIVE) {
			throw inactiveAccountError();
		}

		const token = await this.dependencies.generateAccessToken({
			id: doctor.id,
			role: ROLES.DOCTOR,
		});

		return {
			access_token: token.accessToken,
			token_type: "Bearer" as const,
			expires_in: token.expiresIn,
			user: {
				id: doctor.id,
				name: doctor.name,
				email: doctor.email,
				specialization: doctor.specialization,
				license_number: doctor.licenseNumber,
				role: ROLES.DOCTOR,
			},
		};
	}

	async loginAdmin(input: EmailLoginInput) {
		const admin = await this.dependencies.admins.findByEmail(input.email);

		if (
			!admin ||
			!(await this.dependencies.verifyPassword(
				input.password,
				admin.passwordHash,
			))
		) {
			throw new AppError(401, "Email atau password salah.");
		}

		if (admin.status !== AccountStatus.ACTIVE) {
			throw inactiveAccountError();
		}

		const token = await this.dependencies.generateAccessToken({
			id: admin.id,
			role: ROLES.ADMIN,
		});

		return {
			access_token: token.accessToken,
			token_type: "Bearer" as const,
			expires_in: token.expiresIn,
			user: {
				id: admin.id,
				name: admin.name,
				email: admin.email,
				role: ROLES.ADMIN,
			},
		};
	}

	async getCurrentAccount(auth: AuthContext) {
		switch (auth.role) {
			case ROLES.PATIENT: {
				const patient = await this.dependencies.patients.findById(auth.id);

				if (!patient) throw invalidTokenAccountError();
				if (patient.status !== AccountStatus.ACTIVE)
					throw inactiveAccountError();

				return {
					user: {
						id: patient.id,
						name: patient.name,
						email: patient.email,
						phone: patient.phone,
						role: ROLES.PATIENT,
					},
				};
			}

			case ROLES.DOCTOR: {
				const doctor = await this.dependencies.doctors.findById(auth.id);

				if (!doctor) throw invalidTokenAccountError();
				if (doctor.status !== AccountStatus.ACTIVE)
					throw inactiveAccountError();

				return {
					user: {
						id: doctor.id,
						name: doctor.name,
						email: doctor.email,
						specialization: doctor.specialization,
						license_number: doctor.licenseNumber,
						role: ROLES.DOCTOR,
					},
				};
			}

			case ROLES.ADMIN: {
				const admin = await this.dependencies.admins.findById(auth.id);

				if (!admin) throw invalidTokenAccountError();
				if (admin.status !== AccountStatus.ACTIVE)
					throw inactiveAccountError();

				return {
					user: {
						id: admin.id,
						name: admin.name,
						email: admin.email,
						role: ROLES.ADMIN,
					},
				};
			}
		}
	}
}

export const authService = new AuthService();
