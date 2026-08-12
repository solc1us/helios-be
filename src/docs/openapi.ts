import type { JsonObject } from "swagger-ui-express";

import { adminPaths } from "./paths/admin.paths";
import { authPaths } from "./paths/auth.paths";
import { healthPaths } from "./paths/health.paths";
import { doctorPaths } from "./paths/doctor.paths";
import { patientPaths } from "./paths/patient.paths";
import { authSchemas } from "./schemas/auth.schema";
import { adminSchemas } from "./schemas/admin.schema";
import { commonSchemas } from "./schemas/common.schema";
import { consultationSchemas } from "./schemas/consultation.schema";
import { doctorConsultationSchemas } from "./schemas/doctorConsultation.schema";

export const openApiDocument: JsonObject = {
	openapi: "3.0.3",
	info: {
		title: "Helios Backend API",
		version: "1.0.0",
		description:
			"Backend API for the Helios health-focused NLP application. Helios provides AI-assisted pre-screening and decision support for doctor review; it does not provide an automatic final medical diagnosis.",
	},
	servers: [
		{
			url: "http://localhost:3001",
			description: "Local development server",
		},
	],
	tags: [
		{ name: "System", description: "Service health and readiness." },
		{
			name: "Authentication",
			description: "Patient registration and actor authentication.",
		},
		{
			name: "Patient",
			description: "Authenticated patient consultation operations.",
		},
		{
			name: "Doctor",
			description: "Doctor consultation queue, claim, review, and close operations.",
		},
		{
			name: "Admin",
			description: "Administrative account management, consultation monitoring, and audit access.",
		},
	],
	paths: {
		...healthPaths,
		...authPaths,
		...patientPaths,
		...doctorPaths,
		...adminPaths,
	},
	components: {
		securitySchemes: {
			BearerAuth: {
				type: "http",
				scheme: "bearer",
				bearerFormat: "JWT",
				description: "JWT access token returned by a login endpoint.",
			},
		},
			schemas: {
			...commonSchemas,
			...authSchemas,
			...consultationSchemas,
			...doctorConsultationSchemas,
			...adminSchemas,
		},
	},
};
