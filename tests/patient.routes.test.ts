import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import { ROLES } from "../src/constants/roles";
import { errorHandler } from "../src/middlewares/error.middleware";
import patientRoutes from "../src/routes/patient.routes";
import { generateAccessToken } from "../src/utils/token";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
	const app = express();

	app.use(express.json());
	app.use("/api/v1/patient", patientRoutes);
	app.use(errorHandler);

	await new Promise<void>((resolve, reject) => {
		server = app.listen(0, "127.0.0.1", (error?: Error) =>
			error ? reject(error) : resolve(),
		);
	});

	const address = server.address() as AddressInfo;
	baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
	await new Promise<void>((resolve, reject) => {
		server.close((error) => (error ? reject(error) : resolve()));
	});
});

async function postWithRole(role: (typeof ROLES)[keyof typeof ROLES]) {
	const token = await generateAccessToken({
		id: "03c72b24-5393-4871-adf5-786df09e4d3f",
		role,
	});

	return fetch(`${baseUrl}/api/v1/patient/consultations`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token.accessToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ complaint_text: "short" }),
	});
}

describe("patient consultation route protection", () => {
	test("rejects a missing token", async () => {
		const response = await fetch(`${baseUrl}/api/v1/patient/consultations`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ complaint_text: "short" }),
		});

		expect(response.status).toBe(401);
	});

	test.each([ROLES.DOCTOR, ROLES.ADMIN])(
		"rejects a %s token",
		async (role) => {
			const response = await postWithRole(role);

			expect(response.status).toBe(403);
		},
	);

	test("rejects a Patient token whose current account no longer exists", async () => {
		const response = await postWithRole(ROLES.PATIENT);
		const body = (await response.json()) as {
			message: string;
		};

		expect(response.status).toBe(401);
		expect(body.message).toBe("Token autentikasi tidak valid.");
	});
});
