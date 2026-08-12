import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import { ROLES } from "../src/constants/roles";
import { errorHandler } from "../src/middlewares/error.middleware";
import adminRoutes from "../src/routes/admin.routes";
import { generateAccessToken } from "../src/utils/token";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
	const app = express();
	app.use(express.json());
	app.use("/api/v1/admin", adminRoutes);
	app.use(errorHandler);
	await new Promise<void>((resolve, reject) => {
		server = app.listen(0, "127.0.0.1", (error?: Error) => error ? reject(error) : resolve());
	});
	baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
	await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

async function requestWithRole(role: (typeof ROLES)[keyof typeof ROLES]) {
	const token = await generateAccessToken({
		id: "03c72b24-5393-4871-adf5-786df09e4d3f",
		role,
	});
	return fetch(`${baseUrl}/api/v1/admin/doctors/not-a-uuid`, {
		headers: { Authorization: `Bearer ${token.accessToken}` },
	});
}

describe("Admin route protection", () => {
	test("rejects a missing token", async () => {
		expect((await fetch(`${baseUrl}/api/v1/admin/doctors`)).status).toBe(401);
	});

	test.each([ROLES.PATIENT, ROLES.DOCTOR])("rejects a %s token", async (role) => {
		expect((await requestWithRole(role)).status).toBe(403);
	});

	test("rejects an Admin token whose current account no longer exists", async () => {
		expect((await requestWithRole(ROLES.ADMIN)).status).toBe(401);
	});
});
