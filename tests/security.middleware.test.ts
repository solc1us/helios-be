import { describe, expect, test } from "bun:test";
import type { NextFunction, Request, Response } from "express";

import { ROLES, type AuthRole } from "../src/constants/roles";
import { AccountStatus } from "../src/generated/prisma/enums";
import {
	createActiveAccountMiddleware,
	type ActiveAccountDependencies,
} from "../src/middlewares/activeAccount.middleware";
import { AppError } from "../src/utils/app-error";

const actorId = "03c72b24-5393-4871-adf5-786df09e4d3f";

function dependencies(status: AccountStatus | null) {
	const result = status === null ? null : { status };
	return {
		findPatientById: async () => result,
		findDoctorById: async () => result,
		findAdminById: async () => result,
	} satisfies ActiveAccountDependencies;
}

async function run(role: AuthRole, status: AccountStatus | null) {
	let nextValue: unknown = Symbol("not-called");
	const middleware = createActiveAccountMiddleware(dependencies(status));
	await middleware(
		{ auth: { id: actorId, role } } as Request,
		{} as Response,
		((value?: unknown) => {
			nextValue = value;
		}) as NextFunction,
	);
	return nextValue;
}

describe("active account middleware", () => {
	test.each([ROLES.PATIENT, ROLES.DOCTOR, ROLES.ADMIN])(
		"allows an active %s account",
		async (role) => {
			expect(await run(role, AccountStatus.ACTIVE)).toBeUndefined();
		},
	);

	test.each([ROLES.PATIENT, ROLES.DOCTOR, ROLES.ADMIN])(
		"rejects an inactive %s account using a previously issued JWT",
		async (role) => {
			const result = await run(role, AccountStatus.INACTIVE);
			expect(result).toBeInstanceOf(AppError);
			expect(result).toMatchObject({ statusCode: 403, message: "Akun tidak aktif." });
		},
	);

	test("rejects a token for an account that no longer exists", async () => {
		expect(await run(ROLES.PATIENT, null)).toMatchObject({ statusCode: 401 });
	});

	test("allows the same valid JWT again after account reactivation", async () => {
		const state: { status: AccountStatus } = { status: AccountStatus.INACTIVE };
		const middleware = createActiveAccountMiddleware({
			findPatientById: async () => state,
			findDoctorById: async () => state,
			findAdminById: async () => state,
		});
		const request = { auth: { id: actorId, role: ROLES.PATIENT } } as Request;
		const results: unknown[] = [];
		const next = ((value?: unknown) => results.push(value)) as NextFunction;

		await middleware(request, {} as Response, next);
		state.status = AccountStatus.ACTIVE;
		await middleware(request, {} as Response, next);

		expect(results[0]).toMatchObject({ statusCode: 403 });
		expect(results[1]).toBeUndefined();
	});
});
