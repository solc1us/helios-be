import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";

function requireEnvironmentVariable(name: string): string {
	const value = process.env[name]?.trim();

	if (!value) {
		throw new Error(`${name} must be set to seed the development admin.`);
	}

	return value;
}

async function main() {
	const connectionString = requireEnvironmentVariable("DATABASE_URL");
	const name = requireEnvironmentVariable("DEV_ADMIN_NAME");
	const email = requireEnvironmentVariable("DEV_ADMIN_EMAIL").toLowerCase();
	const password = requireEnvironmentVariable("DEV_ADMIN_PASSWORD");
	const adapter = new PrismaPg({ connectionString });
	const prisma = new PrismaClient({ adapter });

	try {
		const existingAdmin = await prisma.admin.findUnique({
			where: { email },
			select: { id: true },
		});

		if (existingAdmin) {
			console.log(`Development admin already exists for ${email}.`);
			return;
		}

		const passwordHash = await hash(password, 12);

		await prisma.admin.create({
			data: {
				name,
				email,
				passwordHash,
			},
		});

		console.log(`Development admin created for ${email}.`);
	} finally {
		await prisma.$disconnect();
	}
}

main().catch((error: unknown) => {
	console.error("Failed to seed the development admin.", error);
	process.exitCode = 1;
});
