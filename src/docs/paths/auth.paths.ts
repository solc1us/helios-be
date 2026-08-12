const validationResponse = {
	description: "Request validation failed.",
	content: {
		"application/json": {
			schema: { $ref: "#/components/schemas/ValidationError" },
		},
	},
} as const;

const serverErrorResponse = {
	description: "Unexpected server error.",
	content: {
		"application/json": {
			schema: { $ref: "#/components/schemas/StandardErrorResponse" },
		},
	},
} as const;

function requestBody(schemaName: string) {
	return {
		required: true,
		content: {
			"application/json": {
				schema: { $ref: `#/components/schemas/${schemaName}` },
			},
		},
	};
}

function successResponse(description: string, schemaName: string) {
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
	return {
		description,
		content: {
			"application/json": {
				schema: { $ref: "#/components/schemas/StandardErrorResponse" },
			},
		},
	};
}

const rateLimitResponse = errorResponse("Too many authentication attempts.");

export const authPaths = {
	"/api/v1/auth/patient/register": {
		post: {
			tags: ["Authentication"],
			summary: "Register a patient",
			operationId: "registerPatient",
			requestBody: requestBody("PatientRegisterRequest"),
			responses: {
				"201": successResponse(
					"Patient registered successfully.",
					"PatientRegisterResponse",
				),
				"409": errorResponse("Email address or phone number already exists."),
				"429": rateLimitResponse,
				"422": validationResponse,
				"500": serverErrorResponse,
			},
		},
	},
	"/api/v1/auth/patient/login": {
		post: {
			tags: ["Authentication"],
			summary: "Log in a patient",
			description: "Accepts either the patient's email address or phone number.",
			operationId: "loginPatient",
			requestBody: requestBody("PatientLoginRequest"),
			responses: {
				"200": successResponse("Login successful.", "PatientLoginResponse"),
				"401": errorResponse("Invalid credentials."),
				"403": errorResponse("Account is inactive."),
				"429": rateLimitResponse,
				"422": validationResponse,
				"500": serverErrorResponse,
			},
		},
	},
	"/api/v1/auth/doctor/login": {
		post: {
			tags: ["Authentication"],
			summary: "Log in a doctor",
			operationId: "loginDoctor",
			requestBody: requestBody("DoctorLoginRequest"),
			responses: {
				"200": successResponse("Login successful.", "DoctorLoginResponse"),
				"401": errorResponse("Invalid credentials."),
				"403": errorResponse("Account is inactive."),
				"429": rateLimitResponse,
				"422": validationResponse,
				"500": serverErrorResponse,
			},
		},
	},
	"/api/v1/auth/admin/login": {
		post: {
			tags: ["Authentication"],
			summary: "Log in an administrator",
			operationId: "loginAdmin",
			requestBody: requestBody("AdminLoginRequest"),
			responses: {
				"200": successResponse("Login successful.", "AdminLoginResponse"),
				"401": errorResponse("Invalid credentials."),
				"403": errorResponse("Account is inactive."),
				"429": rateLimitResponse,
				"422": validationResponse,
				"500": serverErrorResponse,
			},
		},
	},
	"/api/v1/auth/me": {
		get: {
			tags: ["Authentication"],
			summary: "Get the current authenticated account",
			operationId: "getCurrentAccount",
			security: [{ BearerAuth: [] }],
			responses: {
				"200": successResponse(
					"Authenticated account returned.",
					"AuthenticatedAccountResponse",
				),
				"401": errorResponse("Token is missing, invalid, or references a missing account."),
				"403": errorResponse("Account is inactive."),
				"500": serverErrorResponse,
			},
		},
	},
} as const;
