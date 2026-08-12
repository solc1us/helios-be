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
const body = (schema: string) => ({
	required: true,
	content: { "application/json": { schema: { $ref: `#/components/schemas/${schema}` } } },
});
const idParameter = {
	name: "id",
	in: "path",
	required: true,
	schema: { type: "string", format: "uuid" },
} as const;
const paginationParameters = [
	{ name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
	{ name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 10 } },
] as const;
const protectedErrors = {
	"401": error("Bearer token is missing or invalid."),
	"403": error("The authenticated account is not an Admin."),
	"500": error("Unexpected server error."),
};
const notFoundValidationErrors = {
	...protectedErrors,
	"404": error("Resource not found."),
	"422": validation,
};

export const adminPaths = {
	"/api/v1/admin/doctors": {
		get: {
			tags: ["Admin"], summary: "List Doctor accounts", operationId: "listAdminDoctors", security,
			parameters: [
				{ name: "status", in: "query", schema: { $ref: "#/components/schemas/AccountStatus" } },
				{ name: "search", in: "query", schema: { type: "string", minLength: 1, maxLength: 255 } },
				...paginationParameters,
			],
			responses: { "200": success("Doctor accounts returned.", "AdminDoctorListResponse"), ...protectedErrors, "422": validation },
		},
		post: {
			tags: ["Admin"], summary: "Create a Doctor account", operationId: "createAdminDoctor", security,
			requestBody: body("AdminCreateDoctorRequest"),
			responses: {
				"201": success("Doctor account created.", "AdminDoctorCreateResponse"),
				...protectedErrors,
				"409": error("Doctor email or license number already exists."),
				"422": validation,
			},
		},
	},
	"/api/v1/admin/doctors/{id}": {
		get: {
			tags: ["Admin"], summary: "Get Doctor account detail", operationId: "getAdminDoctor", security,
			parameters: [idParameter], responses: { "200": success("Doctor detail returned.", "AdminDoctorDetailResponse"), ...notFoundValidationErrors },
		},
		patch: {
			tags: ["Admin"], summary: "Update Doctor profile fields", operationId: "updateAdminDoctor", security,
			parameters: [idParameter], requestBody: body("AdminUpdateDoctorRequest"),
			responses: { "200": success("Doctor profile updated.", "AdminDoctorUpdateResponse"), ...notFoundValidationErrors, "409": error("Doctor email or license number already exists.") },
		},
	},
	"/api/v1/admin/doctors/{id}/status": {
		patch: {
			tags: ["Admin"], summary: "Activate or deactivate a Doctor account", operationId: "updateAdminDoctorStatus", security,
			parameters: [idParameter], requestBody: body("AdminUpdateAccountStatusRequest"),
			responses: { "200": success("Doctor status updated.", "AdminDoctorStatusResponse"), ...notFoundValidationErrors },
		},
	},
	"/api/v1/admin/patients": {
		get: {
			tags: ["Admin"], summary: "List Patient accounts", operationId: "listAdminPatients", security,
			parameters: [
				{ name: "status", in: "query", schema: { $ref: "#/components/schemas/AccountStatus" } },
				{ name: "search", in: "query", schema: { type: "string", minLength: 1, maxLength: 255 } },
				...paginationParameters,
			],
			responses: { "200": success("Patient accounts returned.", "AdminPatientListResponse"), ...protectedErrors, "422": validation },
		},
	},
	"/api/v1/admin/patients/{id}": {
		get: {
			tags: ["Admin"], summary: "Get Patient account detail", operationId: "getAdminPatient", security,
			parameters: [idParameter], responses: { "200": success("Patient detail returned.", "AdminPatientDetailResponse"), ...notFoundValidationErrors },
		},
	},
	"/api/v1/admin/patients/{id}/status": {
		patch: {
			tags: ["Admin"], summary: "Activate or deactivate a Patient account", operationId: "updateAdminPatientStatus", security,
			parameters: [idParameter], requestBody: body("AdminUpdateAccountStatusRequest"),
			responses: { "200": success("Patient status updated.", "AdminPatientStatusResponse"), ...notFoundValidationErrors },
		},
	},
	"/api/v1/admin/consultations": {
		get: {
			tags: ["Admin"], summary: "Monitor consultations", operationId: "listAdminConsultations", security,
			parameters: [
				{ name: "status", in: "query", schema: { $ref: "#/components/schemas/ConsultationStatus" } },
				{ name: "patient_id", in: "query", schema: { type: "string", format: "uuid" } },
				{ name: "doctor_id", in: "query", schema: { type: "string", format: "uuid" } },
				{ name: "urgency_level", in: "query", schema: { $ref: "#/components/schemas/UrgencyLevel" } },
				...paginationParameters,
			],
			responses: { "200": success("Consultations returned.", "AdminConsultationListResponse"), ...protectedErrors, "422": validation },
		},
	},
	"/api/v1/admin/consultations/{id}": {
		get: {
			tags: ["Admin"], summary: "Inspect consultation detail", operationId: "getAdminConsultation", security,
			description: "Read-only operational detail. AI raw output and password hashes are never returned.",
			parameters: [idParameter], responses: { "200": success("Consultation detail returned.", "AdminConsultationDetailResponse"), ...notFoundValidationErrors },
		},
	},
	"/api/v1/admin/audit-logs": {
		get: {
			tags: ["Admin"], summary: "List audit logs", operationId: "listAdminAuditLogs", security,
			parameters: [
				{ name: "actor_type", in: "query", schema: { type: "string", enum: ["patient", "doctor", "admin", "system"] } },
				{ name: "actor_id", in: "query", schema: { type: "string", format: "uuid" } },
				{ name: "consultation_id", in: "query", schema: { type: "string", format: "uuid" } },
				{ name: "action", in: "query", schema: { type: "string", minLength: 1, maxLength: 255 } },
				...paginationParameters,
			],
			responses: { "200": success("Audit logs returned.", "AdminAuditLogListResponse"), ...protectedErrors, "422": validation },
		},
	},
} as const;
