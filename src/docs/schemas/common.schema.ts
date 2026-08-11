export const commonSchemas = {
	AccountStatus: {
		type: "string",
		enum: ["active", "inactive"],
	},
	ConsultationStatus: {
		type: "string",
		enum: [
			"submitted",
			"processing",
			"analyzed",
			"in_review",
			"reviewed",
			"closed",
			"failed",
		],
	},
	ErrorDetail: {
		type: "object",
		required: ["field", "message"],
		additionalProperties: false,
		properties: {
			field: { type: "string", example: "email" },
			message: { type: "string", example: "Email tidak valid." },
		},
	},
	StandardErrorResponse: {
		type: "object",
		required: ["success", "message", "errors"],
		additionalProperties: false,
		properties: {
			success: { type: "boolean", enum: [false] },
			message: {
				type: "string",
				example: "Terjadi kesalahan pada sistem.",
			},
			errors: {
				type: "array",
				items: { $ref: "#/components/schemas/ErrorDetail" },
				example: [],
			},
		},
	},
	ValidationError: {
		type: "object",
		required: ["success", "message", "errors"],
		additionalProperties: false,
		properties: {
			success: { type: "boolean", enum: [false] },
			message: { type: "string", enum: ["Validasi gagal."] },
			errors: {
				type: "array",
				minItems: 1,
				items: { $ref: "#/components/schemas/ErrorDetail" },
			},
		},
	},
	Pagination: {
		type: "object",
		required: ["page", "limit", "total", "total_pages"],
		additionalProperties: false,
		properties: {
			page: { type: "integer", minimum: 1, example: 1 },
			limit: { type: "integer", minimum: 1, maximum: 100, example: 10 },
			total: { type: "integer", minimum: 0, example: 12 },
			total_pages: { type: "integer", minimum: 0, example: 2 },
		},
	},
	HealthSuccessResponse: {
		type: "object",
		required: ["success", "message", "data"],
		additionalProperties: false,
		properties: {
			success: { type: "boolean", enum: [true] },
			message: { type: "string", enum: ["Service healthy."] },
			data: {
				type: "object",
				required: ["status", "database"],
				additionalProperties: false,
				properties: {
					status: { type: "string", enum: ["healthy"] },
					database: { type: "string", enum: ["connected"] },
				},
			},
		},
	},
	HealthFailureResponse: {
		type: "object",
		required: ["success", "message", "data"],
		additionalProperties: false,
		properties: {
			success: { type: "boolean", enum: [false] },
			message: { type: "string", enum: ["Service unhealthy."] },
			data: {
				type: "object",
				required: ["status", "database"],
				additionalProperties: false,
				properties: {
					status: { type: "string", enum: ["unhealthy"] },
					database: { type: "string", enum: ["disconnected"] },
				},
			},
		},
	},
} as const;
