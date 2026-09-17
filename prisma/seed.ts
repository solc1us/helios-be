import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";

function requireEnvironmentVariable(name: string): string {
	const value = process.env[name]?.trim();

	if (!value) {
		throw new Error(`${name} must be set to seed development data.`);
	}

	return value;
}

async function main() {
	const connectionString = requireEnvironmentVariable("DATABASE_URL");
	const adapter = new PrismaPg({ connectionString });
	const prisma = new PrismaClient({ adapter });

	try {
		// Admin
		const adminName = requireEnvironmentVariable("DEV_ADMIN_NAME");
		const adminEmail =
			requireEnvironmentVariable("DEV_ADMIN_EMAIL").toLowerCase();
		const adminPassword = requireEnvironmentVariable("DEV_ADMIN_PASSWORD");

		const existingAdmin = await prisma.admin.findUnique({
			where: { email: adminEmail },
			select: { id: true },
		});

		if (existingAdmin) {
			console.log(`Development admin already exists for ${adminEmail}.`);
		} else {
			const passwordHash = await hash(adminPassword, 12);

			await prisma.admin.create({
				data: {
					name: adminName,
					email: adminEmail,
					passwordHash,
				},
			});

			console.log(`Development admin created for ${adminEmail}.`);
		}

		// Doctor
		const doctorName = requireEnvironmentVariable("DEV_DOCTOR_NAME");
		const doctorEmail =
			requireEnvironmentVariable("DEV_DOCTOR_EMAIL").toLowerCase();
		const doctorPassword = requireEnvironmentVariable("DEV_DOCTOR_PASSWORD");
		const doctorSpecialization = requireEnvironmentVariable(
			"DEV_DOCTOR_SPECIALIZATION",
		);
		const doctorLicenseNumber = requireEnvironmentVariable(
			"DEV_DOCTOR_LICENSE_NUMBER",
		);

		const existingDoctor = await prisma.doctor.findUnique({
			where: { email: doctorEmail },
			select: { id: true },
		});

		if (existingDoctor) {
			console.log(`Development doctor already exists for ${doctorEmail}.`);
		} else {
			const passwordHash = await hash(doctorPassword, 12);

			await prisma.doctor.create({
				data: {
					name: doctorName,
					email: doctorEmail,
					passwordHash,
					specialization: doctorSpecialization,
					licenseNumber: doctorLicenseNumber,
				},
			});

			console.log(`Development doctor created for ${doctorEmail}.`);
		}
	} finally {
		await prisma.$disconnect();
	}
}

main().catch((error: unknown) => {
	console.error("Failed to seed development data.", error);
	process.exitCode = 1;
});
