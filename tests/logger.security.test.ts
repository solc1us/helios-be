import { describe, expect, test } from "bun:test";
import type { DestinationStream } from "pino";

import { createLogger, requestLoggerOptions } from "../src/utils/logger";

describe("sensitive logging protections", () => {
	test("redacts credentials, tokens, and health free text", () => {
		let output = "";
		const destination = {
			write(chunk: string) {
				output += chunk;
			},
		} as DestinationStream;
		const testLogger = createLogger(destination);

		testLogger.info({
			req: {
				headers: { authorization: "Bearer secret-jwt" },
				body: {
					password: "secret-password",
					complaint_text: "sensitive complaint",
					review_note: "sensitive review",
				},
			},
			DATABASE_URL: "postgresql://secret",
			JWT_SECRET: "jwt-secret",
		});

		expect(output).toContain("[REDACTED]");
		for (const secret of [
			"secret-jwt",
			"secret-password",
			"sensitive complaint",
			"sensitive review",
			"postgresql://secret",
			"jwt-secret",
		]) {
			expect(output).not.toContain(secret);
		}
	});

	test("request serializer keeps metadata but never serializes headers or body", () => {
		const serialized = requestLoggerOptions.serializers.req({
			method: "POST",
			url: "/api/v1/patient/consultations",
			remoteAddress: "127.0.0.1",
			headers: { authorization: "Bearer secret" },
			body: { complaint_text: "sensitive" },
		} as never);

		expect(serialized).toEqual({
			method: "POST",
			url: "/api/v1/patient/consultations",
			remoteAddress: "127.0.0.1",
		});
		expect(JSON.stringify(serialized)).not.toContain("secret");
		expect(JSON.stringify(serialized)).not.toContain("sensitive");
	});
});
