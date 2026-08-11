import { describe, expect, test } from "bun:test";

import { hashPassword, verifyPassword } from "../src/utils/password";

describe("password utility", () => {
	test("hashes a password and verifies the correct password", async () => {
		const passwordHash = await hashPassword("password123");

		expect(passwordHash).not.toBe("password123");
		expect(await verifyPassword("password123", passwordHash)).toBe(true);
	});

	test("rejects the wrong password", async () => {
		const passwordHash = await hashPassword("password123");

		expect(await verifyPassword("incorrect-password", passwordHash)).toBe(
			false,
		);
	});
});
