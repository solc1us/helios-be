import { describe, expect, test } from "bun:test";
import SwaggerParser from "@apidevtools/swagger-parser";

import { openApiDocument } from "../src/docs/openapi";

interface Operation {
	security?: Array<Record<string, string[]>>;
}

interface OpenApiForTests {
	openapi: string;
	paths: Record<string, Record<string, Operation>>;
	components: {
		securitySchemes: Record<string, Record<string, unknown>>;
		schemas: Record<
			string,
			{ properties?: Record<string, Record<string, unknown>> }
		>;
	};
}

const document = openApiDocument as unknown as OpenApiForTests;

const expectedPaths = [
	"/api/v1/health",
	"/api/v1/auth/patient/register",
	"/api/v1/auth/patient/login",
	"/api/v1/auth/doctor/login",
	"/api/v1/auth/admin/login",
	"/api/v1/auth/me",
	"/api/v1/patient/consultations",
	"/api/v1/patient/consultations/{id}",
	"/api/v1/doctor/consultations",
	"/api/v1/doctor/consultations/{id}",
	"/api/v1/doctor/consultations/{id}/claim",
	"/api/v1/doctor/consultations/{id}/review",
	"/api/v1/doctor/consultations/{id}/status",
].sort();

const protectedOperations = [
	["/api/v1/auth/me", "get"],
	["/api/v1/patient/consultations", "post"],
	["/api/v1/patient/consultations", "get"],
	["/api/v1/patient/consultations/{id}", "get"],
	["/api/v1/doctor/consultations", "get"],
	["/api/v1/doctor/consultations/{id}", "get"],
	["/api/v1/doctor/consultations/{id}/claim", "patch"],
	["/api/v1/doctor/consultations/{id}/review", "patch"],
	["/api/v1/doctor/consultations/{id}/status", "patch"],
] as const;

const publicOperations = [
	["/api/v1/health", "get"],
	["/api/v1/auth/patient/register", "post"],
	["/api/v1/auth/patient/login", "post"],
	["/api/v1/auth/doctor/login", "post"],
	["/api/v1/auth/admin/login", "post"],
] as const;

describe("OpenAPI document", () => {
	test("is a valid OpenAPI 3.0.3 document", async () => {
		const serializableDocument = JSON.parse(JSON.stringify(openApiDocument));

		await expect(SwaggerParser.validate(serializableDocument)).resolves.toBeDefined();
		expect(document.openapi).toBe("3.0.3");
	});

	test("documents exactly the currently implemented route paths", () => {
		expect(Object.keys(document.paths).sort()).toEqual(expectedPaths);
	});

	test("defines BearerAuth only on protected operations", () => {
		expect(document.components.securitySchemes.BearerAuth).toMatchObject({
			type: "http",
			scheme: "bearer",
			bearerFormat: "JWT",
		});

		for (const [path, method] of protectedOperations) {
			expect(document.paths[path]?.[method]?.security).toEqual([
				{ BearerAuth: [] },
			]);
		}

		for (const [path, method] of publicOperations) {
			expect(document.paths[path]?.[method]?.security).toBeUndefined();
		}
	});

	test("documents the Phase 4.1 patient-safe list contract", () => {
		const itemProperties =
			document.components.schemas.PatientConsultationListItem?.properties;
		const statisticsProperties =
			document.components.schemas.DashboardStatistics?.properties;

		expect(itemProperties).toHaveProperty("complaint_text");
		expect(itemProperties).not.toHaveProperty("complaint_preview");
		expect(itemProperties?.category?.nullable).toBe(true);
		expect(itemProperties?.confidence_score?.nullable).toBe(true);
		expect(statisticsProperties).toEqual(
			expect.objectContaining({
				this_month: expect.any(Object),
				best_confidence: expect.any(Object),
				top_diagnosis: expect.any(Object),
				distribution: expect.any(Object),
			}),
		);

		expect(
			JSON.stringify(
				document.components.schemas.PatientConsultationListResponse,
			),
		).not.toContain('"ai_analysis"');
		expect(
			JSON.stringify(
				document.components.schemas.PatientConsultationDetailResponse,
			),
		).not.toContain('"ai_analysis"');
	});

	test("documents only the safe temporary dummy result on consultation creation", () => {
		const aiProperties =
			document.components.schemas.TemporaryDummyAiAnalysis?.properties;

		expect(aiProperties).toEqual(
			expect.objectContaining({
				summary: expect.any(Object),
				detected_symptoms: expect.any(Object),
				severity_level: expect.any(Object),
				possible_category: expect.any(Object),
				urgency_level: expect.any(Object),
				confidence_score: expect.any(Object),
				model_version: expect.any(Object),
			}),
		);
		expect(aiProperties).not.toHaveProperty("rawOutput");
		expect(aiProperties).not.toHaveProperty("processingTimeMs");
		expect(aiProperties).not.toHaveProperty("raw_output");
		expect(aiProperties).not.toHaveProperty("processing_time_ms");
	});

	test("documents Doctor workflow without internal AI fields", () => {
		const schemas = JSON.stringify({
			list: document.components.schemas.DoctorConsultationListResponse,
			detail: document.components.schemas.DoctorConsultationDetailResponse,
		});

		expect(schemas).toContain("DoctorAiAnalysis");
		expect(schemas).not.toContain("rawOutput");
		expect(schemas).not.toContain("processingTimeMs");
		expect(schemas).not.toContain("raw_output");
		expect(schemas).not.toContain("processing_time_ms");
	});
});
