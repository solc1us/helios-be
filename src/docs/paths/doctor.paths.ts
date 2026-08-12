const security = [{ BearerAuth: [] }] as const;
const error = (description: string) => ({
	description,
	content: { "application/json": { schema: { $ref: "#/components/schemas/StandardErrorResponse" } } },
});
const validation = {
	description: "Request validation failed.",
	content: { "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } } },
};
const success = (description: string, schema: string) => ({
	description,
	content: { "application/json": { schema: { $ref: `#/components/schemas/${schema}` } } },
});
const idParameter = {
	name: "id",
	in: "path",
	required: true,
	schema: { type: "string", format: "uuid" },
} as const;
const protectedErrors = {
	"401": error("Bearer token is missing or invalid."),
	"403": error("The authenticated account is not a doctor."),
	"500": error("Unexpected server error."),
};

export const doctorPaths = {
	"/api/v1/doctor/consultations": {
		get: {
			tags: ["Doctor"],
			summary: "List available or assigned consultations",
			operationId: "listDoctorConsultations",
			security,
			parameters: [
				{ name: "scope", in: "query", schema: { type: "string", enum: ["available", "mine"], default: "available" } },
				{ name: "status", in: "query", schema: { $ref: "#/components/schemas/ConsultationStatus" } },
				{ name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
				{ name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 10 } },
			],
			responses: {
				"200": success("Consultation queue returned.", "DoctorConsultationListResponse"),
				...protectedErrors,
				"422": validation,
			},
		},
	},
	"/api/v1/doctor/consultations/{id}": {
		get: {
			tags: ["Doctor"],
			summary: "Get an accessible consultation with safe AI analysis",
			operationId: "getDoctorConsultationDetail",
			security,
			parameters: [idParameter],
			responses: {
				"200": success("Consultation detail returned.", "DoctorConsultationDetailResponse"),
				...protectedErrors,
				"404": error("Consultation not found."),
				"422": validation,
			},
		},
	},
	"/api/v1/doctor/consultations/{id}/claim": {
		patch: {
			tags: ["Doctor"],
			summary: "Atomically claim an available consultation",
			operationId: "claimDoctorConsultation",
			security,
			parameters: [idParameter],
			responses: {
				"200": success("Consultation claimed.", "DoctorClaimResponse"),
				...protectedErrors,
				"404": error("Consultation not found."),
				"409": error("Consultation is not claimable."),
				"422": validation,
			},
		},
	},
	"/api/v1/doctor/consultations/{id}/review": {
		patch: {
			tags: ["Doctor"],
			summary: "Create the assigned Doctor's consultation review",
			operationId: "reviewDoctorConsultation",
			security,
			parameters: [idParameter],
			requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/DoctorReviewRequest" } } } },
			responses: {
				"200": success("Review created.", "DoctorReviewResponse"),
				...protectedErrors,
				"404": error("Consultation not found."),
				"409": error("Consultation cannot be reviewed."),
				"422": validation,
			},
		},
	},
	"/api/v1/doctor/consultations/{id}/status": {
		patch: {
			tags: ["Doctor"],
			summary: "Close a reviewed consultation",
			operationId: "closeDoctorConsultation",
			security,
			parameters: [idParameter],
			requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CloseConsultationRequest" } } } },
			responses: {
				"200": success("Consultation closed.", "CloseConsultationResponse"),
				...protectedErrors,
				"404": error("Consultation not found."),
				"409": error("Consultation cannot be closed."),
				"422": validation,
			},
		},
	},
} as const;
