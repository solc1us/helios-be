const validationResponse = {
	description: "Request validation failed.",
	content: {
		"application/json": {
			schema: { $ref: "#/components/schemas/ValidationError" },
		},
	},
} as const;

function standardResponse(description: string, schemaName: string) {
	return {
		description,
		content: {
			"application/json": {
				schema: { $ref: `#/components/schemas/${schemaName}` },
			},
		},
	};
}

function errorResponse(description: string) {
	return standardResponse(description, "StandardErrorResponse");
}

const protectedErrors = {
	"401": errorResponse("Bearer token is missing or invalid."),
	"403": errorResponse("The authenticated account is not a patient."),
	"500": errorResponse("Unexpected server error."),
} as const;

export const patientPaths = {
	"/api/v1/patient/consultations": {
		post: {
			tags: ["Patient"],
			summary: "Create a consultation",
			description:
				"Creates a consultation owned by the authenticated patient with submitted status. This endpoint does not start AI processing.",
			operationId: "createPatientConsultation",
			security: [{ BearerAuth: [] }],
			requestBody: {
				required: true,
				content: {
					"application/json": {
						schema: { $ref: "#/components/schemas/ConsultationCreateRequest" },
					},
				},
			},
			responses: {
				"201": standardResponse(
					"Consultation created with submitted status.",
					"ConsultationCreatedResponse",
				),
				...protectedErrors,
				"422": validationResponse,
			},
		},
		get: {
			tags: ["Patient"],
			summary: "List the patient's consultations",
			description:
				"Returns the authenticated patient's newest consultations first. Dashboard statistics cover the full patient history and are unaffected by pagination or status filtering.",
			operationId: "listPatientConsultations",
			security: [{ BearerAuth: [] }],
			parameters: [
				{
					name: "status",
					in: "query",
					required: false,
					description: "Filters only list items and pagination totals.",
					schema: { $ref: "#/components/schemas/ConsultationStatus" },
				},
				{
					name: "page",
					in: "query",
					required: false,
					schema: { type: "integer", minimum: 1, default: 1 },
				},
				{
					name: "limit",
					in: "query",
					required: false,
					schema: {
						type: "integer",
						minimum: 1,
						maximum: 100,
						default: 10,
					},
				},
			],
			responses: {
				"200": standardResponse(
					"Patient consultation history and dashboard statistics.",
					"PatientConsultationListResponse",
				),
				...protectedErrors,
				"422": validationResponse,
			},
		},
	},
	"/api/v1/patient/consultations/{id}": {
		get: {
			tags: ["Patient"],
			summary: "Get a patient consultation detail",
			description:
				"Returns an owned consultation without exposing AI analysis data.",
			operationId: "getPatientConsultationDetail",
			security: [{ BearerAuth: [] }],
			parameters: [
				{
					name: "id",
					in: "path",
					required: true,
					description: "Consultation identifier.",
					schema: { type: "string", format: "uuid" },
				},
			],
			responses: {
				"200": standardResponse(
					"Owned consultation returned.",
					"PatientConsultationDetailResponse",
				),
				...protectedErrors,
				"404": errorResponse("Consultation not found."),
				"422": validationResponse,
			},
		},
	},
} as const;
