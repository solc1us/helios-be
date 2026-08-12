import { describe, expect, test } from "bun:test";

import { ROLES } from "../src/constants/roles";
import {
	generateAccessToken,
	verifyAccessToken,
} from "../src/utils/token";

describe("JWT utility", () => {
	test("generates and verifies a token while preserving sub and role", async () => {
		const auth = {
			id: "03c72b24-5393-4871-adf5-786df09e4d3f",
			role: ROLES.PATIENT,
		};
		const generated = await generateAccessToken(auth);

		expect(generated.accessToken.split(".")).toHaveLength(3);
		expect(generated.expiresIn).toBe(86_400);
		expect(await verifyAccessToken(generated.accessToken)).toEqual(auth);
	});

	test("rejects an invalid token", async () => {
		expect(verifyAccessToken("invalid-token")).rejects.toBeDefined();
	});

	test("rejects a signed token whose subject is not an actor UUID", async () => {
		const generated = await generateAccessToken({
			id: "not-a-uuid",
			role: ROLES.PATIENT,
		});

		expect(verifyAccessToken(generated.accessToken)).rejects.toBeDefined();
	});

	test("rejects an expired token", async () => {
		const generated = await generateAccessToken(
			{
				id: "03c72b24-5393-4871-adf5-786df09e4d3f",
				role: ROLES.ADMIN,
			},
			{
				expiresIn: "1s",
				issuedAt: Math.floor(Date.now() / 1000) - 60,
			},
		);

		expect(verifyAccessToken(generated.accessToken)).rejects.toBeDefined();
	});
});
