import { describe, expect, test } from "bun:test";

import {
	emailLoginSchema,
	patientLoginSchema,
	patientRegistrationSchema,
} from "../src/validators/auth.validator";

describe("auth validation", () => {
	test("trims and normalizes registration input", () => {
		const result = patientRegistrationSchema.parse({
			name: "  Budi Santoso  ",
			email: "  BUDI@MAIL.COM  ",
			phone: " 08123456789 ",
			password: "password123",
			birth_date: "2001-05-10",
		});

		expect(result).toMatchObject({
			name: "Budi Santoso",
			email: "budi@mail.com",
			phone: "08123456789",
		});
	});

	test("rejects a future birth date", () => {
		const result = patientRegistrationSchema.safeParse({
			name: "Budi",
			email: "budi@mail.com",
			phone: "08123",
			password: "password123",
			birth_date: "2999-01-01",
		});

		expect(result.success).toBe(false);
	});

	test("normalizes patient email identifiers and actor emails", () => {
		expect(
			patientLoginSchema.parse({
				identifier: " BUDI@MAIL.COM ",
				password: "password123",
			}).identifier,
		).toBe("budi@mail.com");
		expect(
			emailLoginSchema.parse({
				email: " ADMIN@MAIL.COM ",
				password: "password123",
			}).email,
		).toBe("admin@mail.com");
	});
});
