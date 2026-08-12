import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import app from "../src/app";
import { env } from "../src/config/env.config";
import { isSwaggerEnabled } from "../src/config/swagger.config";
import { createRateLimiter } from "../src/middlewares/rateLimit.middleware";
import { errorHandler } from "../src/middlewares/error.middleware";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
	await new Promise<void>((resolve, reject) => {
		server = app.listen(0, "127.0.0.1", (error?: Error) =>
			error ? reject(error) : resolve(),
		);
	});
	baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
	await new Promise<void>((resolve, reject) => {
		server.close((error) => (error ? reject(error) : resolve()));
	});
});

describe("HTTP security hardening", () => {
	test("keeps important Helmet headers enabled and hides Express", async () => {
		const response = await fetch(`${baseUrl}/missing`);
		expect(response.headers.get("x-content-type-options")).toBe("nosniff");
		expect(response.headers.get("content-security-policy")).toBeTruthy();
		expect(response.headers.get("x-powered-by")).toBeNull();
	});

	test("allows the configured CORS origin and rejects an unexpected origin", async () => {
		const allowed = await fetch(`${baseUrl}/missing`, {
			headers: { Origin: env.CORS_ORIGIN },
		});
		const rejected = await fetch(`${baseUrl}/missing`, {
			headers: { Origin: "https://unexpected.example" },
		});

		expect(allowed.headers.get("access-control-allow-origin")).toBe(env.CORS_ORIGIN);
		expect(rejected.status).toBe(403);
		expect(await rejected.json()).toEqual({
			success: false,
			message: "Origin tidak diizinkan.",
			errors: [],
		});
	});

	test("rejects oversized JSON using a safe 413 response", async () => {
		const response = await fetch(`${baseUrl}/api/v1/auth/patient/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ identifier: "patient@example.test", password: "x".repeat(110_000) }),
		});

		expect(response.status).toBe(413);
		expect(await response.json()).toEqual({
			success: false,
			message: "Payload request terlalu besar.",
			errors: [],
		});
	});

	test("rejects malformed JSON without parser internals", async () => {
		const response = await fetch(`${baseUrl}/api/v1/auth/patient/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "{invalid-json",
		});
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			success: false,
			message: "Format JSON tidak valid.",
			errors: [],
		});
	});

	test("keeps Swagger disabled in production", () => {
		expect(isSwaggerEnabled("development")).toBe(true);
		expect(isSwaggerEnabled("test")).toBe(true);
		expect(isSwaggerEnabled("production")).toBe(false);
	});

	test("sanitizes unexpected errors without stack, paths, or database detail", async () => {
		const errorApp = express();
		errorApp.get("/error", () => {
			throw new Error("PostgreSQL failed at C:\\secret\\server.ts using password=secret");
		});
		errorApp.use(errorHandler);
		const errorServer = await new Promise<Server>((resolve, reject) => {
			const value = errorApp.listen(0, "127.0.0.1", (error?: Error) =>
				error ? reject(error) : resolve(value),
			);
		});
		try {
			const response = await fetch(
				`http://127.0.0.1:${(errorServer.address() as AddressInfo).port}/error`,
			);
			const serialized = JSON.stringify(await response.json());
			expect(response.status).toBe(500);
			expect(serialized).toBe(
				JSON.stringify({
					success: false,
					message: "Terjadi kesalahan pada sistem.",
					errors: [],
				}),
			);
			for (const internal of ["PostgreSQL", "server.ts", "password", "stack"]) {
				expect(serialized).not.toContain(internal);
			}
		} finally {
			await new Promise<void>((resolve, reject) =>
				errorServer.close((error) => (error ? reject(error) : resolve())),
			);
		}
	});
});

async function withRateLimitedServer(
	max: number,
	callback: (url: string) => Promise<void>,
) {
	const limitedApp = express();
	limitedApp.use(createRateLimiter({ windowMs: 60_000, max }));
	limitedApp.post("/request", (_req, res) => {
		res.status(200).json({ success: true });
	});
	const limitedServer = await new Promise<Server>((resolve, reject) => {
		const value = limitedApp.listen(0, "127.0.0.1", (error?: Error) =>
			error ? reject(error) : resolve(value),
		);
	});
	try {
		await callback(`http://127.0.0.1:${(limitedServer.address() as AddressInfo).port}/request`);
	} finally {
		await new Promise<void>((resolve, reject) =>
			limitedServer.close((error) => (error ? reject(error) : resolve())),
		);
	}
}

describe("rate limiting", () => {
	test("allows normal auth volume and eventually returns a safe 429", async () => {
		await withRateLimitedServer(2, async (url) => {
			expect((await fetch(url, { method: "POST" })).status).toBe(200);
			expect((await fetch(url, { method: "POST" })).status).toBe(200);
			const limited = await fetch(url, { method: "POST" });
			expect(limited.status).toBe(429);
			expect(await limited.json()).toEqual({
				success: false,
				message: "Terlalu banyak permintaan. Silakan coba lagi nanti.",
				errors: [],
			});
		});
	});

	test("can enforce a stricter limiter for AI-triggering writes", async () => {
		await withRateLimitedServer(1, async (url) => {
			expect((await fetch(url, { method: "POST" })).status).toBe(200);
			expect((await fetch(url, { method: "POST" })).status).toBe(429);
		});
	});
});
