import { describe, expect, test } from "bun:test";
import type { NextFunction, Request, Response } from "express";

import { ROLES } from "../src/constants/roles";
import { adminOnly } from "../src/middlewares/adminOnly.middleware";
import { authMiddleware } from "../src/middlewares/auth.middleware";
import { doctorOnly } from "../src/middlewares/doctorOnly.middleware";
import { patientOnly } from "../src/middlewares/patientOnly.middleware";
import { AppError } from "../src/utils/app-error";
import { generateAccessToken } from "../src/utils/token";

function createRequest(authorization?: string): Request {
	return {
		get: (name: string) =>
			name.toLowerCase() === "authorization" ? authorization : undefined,
	} as Request;
}

function createNextCollector() {
	let called = false;
	let value: unknown;
	const next = ((argument?: unknown) => {
		called = true;
		value = argument;
	}) as NextFunction;

	return {
		next,
		wasCalled: () => called,
		value: () => value,
	};
}

describe("auth middleware", () => {
	test("returns 401 when the Authorization header is missing", async () => {
		const collector = createNextCollector();

		await authMiddleware(
			createRequest(),
			{} as Response,
			collector.next,
		);

		expect(collector.value()).toBeInstanceOf(AppError);
		expect(collector.value()).toMatchObject({ statusCode: 401 });
	});

	test("returns 401 for a malformed Bearer header", async () => {
		const collector = createNextCollector();

		await authMiddleware(
			createRequest("Basic credentials"),
			{} as Response,
			collector.next,
		);

		expect(collector.value()).toMatchObject({ statusCode: 401 });
	});

	test("returns 401 for an invalid token", async () => {
		const collector = createNextCollector();

		await authMiddleware(
			createRequest("Bearer invalid-token"),
			{} as Response,
			collector.next,
		);

		expect(collector.value()).toMatchObject({ statusCode: 401 });
	});

	test("attaches valid auth context and passes", async () => {
		const auth = {
			id: "03c72b24-5393-4871-adf5-786df09e4d3f",
			role: ROLES.PATIENT,
		};
		const generated = await generateAccessToken(auth);
		const request = createRequest(`Bearer ${generated.accessToken}`);
		const collector = createNextCollector();

		await authMiddleware(request, {} as Response, collector.next);

		expect(collector.wasCalled()).toBe(true);
		expect(collector.value()).toBeUndefined();
		expect(request.auth).toEqual(auth);
	});
});

describe("role middleware", () => {
	test("returns 401 without authenticated context", () => {
		const collector = createNextCollector();

		patientOnly({} as Request, {} as Response, collector.next);

		expect(collector.value()).toMatchObject({ statusCode: 401 });
	});

	test("patientOnly accepts patient and rejects doctor", () => {
		const accepted = createNextCollector();
		const rejected = createNextCollector();

		patientOnly(
			{ auth: { id: "patient", role: ROLES.PATIENT } } as Request,
			{} as Response,
			accepted.next,
		);
		patientOnly(
			{ auth: { id: "doctor", role: ROLES.DOCTOR } } as Request,
			{} as Response,
			rejected.next,
		);

		expect(accepted.value()).toBeUndefined();
		expect(rejected.value()).toMatchObject({ statusCode: 403 });
	});

	test("doctorOnly accepts doctor and rejects patient", () => {
		const accepted = createNextCollector();
		const rejected = createNextCollector();

		doctorOnly(
			{ auth: { id: "doctor", role: ROLES.DOCTOR } } as Request,
			{} as Response,
			accepted.next,
		);
		doctorOnly(
			{ auth: { id: "patient", role: ROLES.PATIENT } } as Request,
			{} as Response,
			rejected.next,
		);

		expect(accepted.value()).toBeUndefined();
		expect(rejected.value()).toMatchObject({ statusCode: 403 });
	});

	test("adminOnly accepts admin and rejects non-admin", () => {
		const accepted = createNextCollector();
		const rejected = createNextCollector();

		adminOnly(
			{ auth: { id: "admin", role: ROLES.ADMIN } } as Request,
			{} as Response,
			accepted.next,
		);
		adminOnly(
			{ auth: { id: "patient", role: ROLES.PATIENT } } as Request,
			{} as Response,
			rejected.next,
		);

		expect(accepted.value()).toBeUndefined();
		expect(rejected.value()).toMatchObject({ statusCode: 403 });
	});
});
