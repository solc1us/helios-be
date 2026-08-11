import { describe, expect, mock, test } from "bun:test";

import { AccountStatus } from "../src/generated/prisma/enums";

import { ROLES } from "../src/constants/roles";
import type { AdminRepository } from "../src/repositories/admin.repository";
import type { DoctorRepository } from "../src/repositories/doctor.repository";
import type { PatientRepository } from "../src/repositories/patient.repository";
import { AuthService } from "../src/services/auth.service";

const activePatient = {
	id: "patient-id",
	name: "Budi Santoso",
	email: "budi@mail.com",
	phone: "08123456789",
	passwordHash: "stored-hash",
	status: AccountStatus.ACTIVE,
};

const activeDoctor = {
	id: "doctor-id",
	name: "dr. Ahmad",
	email: "doctor@mail.com",
	specialization: "Penyakit Dalam",
	licenseNumber: "SIP-123",
	passwordHash: "stored-hash",
	status: AccountStatus.ACTIVE,
};

const activeAdmin = {
	id: "admin-id",
	name: "Admin Sistem",
	email: "admin@mail.com",
	passwordHash: "stored-hash",
	status: AccountStatus.ACTIVE,
};

interface ServiceOverrides {
	patients?: Partial<PatientRepository>;
	doctors?: Partial<DoctorRepository>;
	admins?: Partial<AdminRepository>;
	hashPassword?: (password: string) => Promise<string>;
	verifyPassword?: (password: string, passwordHash: string) => Promise<boolean>;
}

function createService(overrides: ServiceOverrides = {}) {
	const patients = {
		findById: async () => null,
		findByEmail: async () => null,
		findByPhone: async () => null,
		findByIdentifier: async () => null,
		create: async () => ({
			...activePatient,
			gender: null,
			birthDate: null,
		}),
		...overrides.patients,
	} as PatientRepository;
	const doctors = {
		findById: async () => null,
		findByEmail: async () => null,
		...overrides.doctors,
	} as DoctorRepository;
	const admins = {
		findById: async () => null,
		findByEmail: async () => null,
		...overrides.admins,
	} as AdminRepository;

	return new AuthService({
		patients,
		doctors,
		admins,
		hashPassword: overrides.hashPassword ?? (async () => "new-hash"),
		verifyPassword: overrides.verifyPassword ?? (async () => true),
		generateAccessToken: async () => ({
			accessToken: "access-token",
			expiresIn: 86_400,
		}),
	});
}

describe("AuthService patient registration", () => {
	test("registers a patient with a hashed password", async () => {
		const hash = mock(async () => "hashed-password");
		const create = mock(async (data) => ({
			id: "patient-id",
			name: data.name,
			email: data.email,
			phone: data.phone,
			gender: data.gender ?? null,
			birthDate: data.birthDate ?? null,
			status: AccountStatus.ACTIVE,
		}));
		const service = createService({
			patients: { create },
			hashPassword: hash,
		});

		const result = await service.registerPatient({
			name: "Budi Santoso",
			email: "budi@mail.com",
			phone: "08123456789",
			password: "password123",
		});

		expect(hash).toHaveBeenCalledWith("password123");
		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({ passwordHash: "hashed-password" }),
		);
		expect(result.patient.status).toBe("active");
		expect(result.patient).not.toHaveProperty("passwordHash");
	});

	test("rejects a duplicate email", async () => {
		const service = createService({
			patients: { findByEmail: async () => ({ id: "existing" }) },
		});

		expect(
			service.registerPatient({
				name: "Budi",
				email: "budi@mail.com",
				phone: "08123",
				password: "password123",
			}),
		).rejects.toMatchObject({ statusCode: 409 });
	});

	test("rejects a duplicate phone", async () => {
		const service = createService({
			patients: { findByPhone: async () => ({ id: "existing" }) },
		});

		expect(
			service.registerPatient({
				name: "Budi",
				email: "budi@mail.com",
				phone: "08123",
				password: "password123",
			}),
		).rejects.toMatchObject({ statusCode: 409 });
	});
});

describe("AuthService patient login", () => {
	test.each([
		["email", "budi@mail.com"],
		["phone", "08123456789"],
	])("logs in by %s", async (_kind, identifier) => {
		const findByIdentifier = mock(async () => activePatient);
		const service = createService({ patients: { findByIdentifier } });

		const result = await service.loginPatient({
			identifier,
			password: "password123",
		});

		expect(findByIdentifier).toHaveBeenCalledWith(identifier);
		expect(result.user.role).toBe(ROLES.PATIENT);
		expect(result.user).not.toHaveProperty("passwordHash");
	});

	test("rejects a wrong password", async () => {
		const service = createService({
			patients: { findByIdentifier: async () => activePatient },
			verifyPassword: async () => false,
		});

		expect(
			service.loginPatient({
				identifier: "budi@mail.com",
				password: "wrong-password",
			}),
		).rejects.toMatchObject({ statusCode: 401 });
	});

	test("rejects an inactive patient", async () => {
		const service = createService({
			patients: {
				findByIdentifier: async () => ({
					...activePatient,
					status: AccountStatus.INACTIVE,
				}),
			},
		});

		expect(
			service.loginPatient({
				identifier: "budi@mail.com",
				password: "password123",
			}),
		).rejects.toMatchObject({ statusCode: 403 });
	});
});

describe("AuthService doctor login", () => {
	test("logs in an active doctor", async () => {
		const service = createService({
			doctors: { findByEmail: async () => activeDoctor },
		});

		const result = await service.loginDoctor({
			email: activeDoctor.email,
			password: "password123",
		});

		expect(result.user.role).toBe(ROLES.DOCTOR);
		expect(result.user.license_number).toBe(activeDoctor.licenseNumber);
	});

	test("rejects invalid doctor credentials", async () => {
		const service = createService();

		expect(
			service.loginDoctor({
				email: "missing@mail.com",
				password: "password123",
			}),
		).rejects.toMatchObject({ statusCode: 401 });
	});

	test("rejects an inactive doctor", async () => {
		const service = createService({
			doctors: {
				findByEmail: async () => ({
					...activeDoctor,
					status: AccountStatus.INACTIVE,
				}),
			},
		});

		expect(
			service.loginDoctor({
				email: activeDoctor.email,
				password: "password123",
			}),
		).rejects.toMatchObject({ statusCode: 403 });
	});
});

describe("AuthService admin login", () => {
	test("logs in an active admin", async () => {
		const service = createService({
			admins: { findByEmail: async () => activeAdmin },
		});

		const result = await service.loginAdmin({
			email: activeAdmin.email,
			password: "password123",
		});

		expect(result.user.role).toBe(ROLES.ADMIN);
		expect(result.user).not.toHaveProperty("passwordHash");
	});

	test("rejects invalid admin credentials", async () => {
		const service = createService();

		expect(
			service.loginAdmin({
				email: "missing@mail.com",
				password: "password123",
			}),
		).rejects.toMatchObject({ statusCode: 401 });
	});

	test("rejects an inactive admin", async () => {
		const service = createService({
			admins: {
				findByEmail: async () => ({
					...activeAdmin,
					status: AccountStatus.INACTIVE,
				}),
			},
		});

		expect(
			service.loginAdmin({
				email: activeAdmin.email,
				password: "password123",
			}),
		).rejects.toMatchObject({ statusCode: 403 });
	});
});

describe("AuthService current account", () => {
	test("queries only the repository matching the token role", async () => {
		const doctorLookup = mock(async () => ({
			...activeDoctor,
		}));
		const patientLookup = mock(async () => null);
		const adminLookup = mock(async () => null);
		const service = createService({
			patients: { findById: patientLookup },
			doctors: { findById: doctorLookup },
			admins: { findById: adminLookup },
		});

		const result = await service.getCurrentAccount({
			id: activeDoctor.id,
			role: ROLES.DOCTOR,
		});

		expect(result.user.role).toBe(ROLES.DOCTOR);
		expect(doctorLookup).toHaveBeenCalledTimes(1);
		expect(patientLookup).not.toHaveBeenCalled();
		expect(adminLookup).not.toHaveBeenCalled();
	});

	test("rejects a token for a missing account", async () => {
		const service = createService();

		expect(
			service.getCurrentAccount({
				id: "missing",
				role: ROLES.ADMIN,
			}),
		).rejects.toMatchObject({ statusCode: 401 });
	});

	test("rejects an account that became inactive", async () => {
		const service = createService({
			admins: {
				findById: async () => ({
					id: activeAdmin.id,
					name: activeAdmin.name,
					email: activeAdmin.email,
					status: AccountStatus.INACTIVE,
				}),
			},
		});

		expect(
			service.getCurrentAccount({
				id: activeAdmin.id,
				role: ROLES.ADMIN,
			}),
		).rejects.toMatchObject({ statusCode: 403 });
	});
});
