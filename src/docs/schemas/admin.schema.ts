const nullableString = { type: "string", nullable: true } as const;
const dateTime = { type: "string", format: "date-time" } as const;

const paginatedResponse = (message: string, itemSchema: string) => ({
	type: "object",
	required: ["success", "message", "data"],
	properties: {
		success: { type: "boolean", enum: [true] },
		message: { type: "string", enum: [message] },
		data: {
			type: "object",
			required: ["items", "pagination"],
			properties: {
				items: { type: "array", items: { $ref: `#/components/schemas/${itemSchema}` } },
				pagination: { $ref: "#/components/schemas/Pagination" },
			},
		},
	},
});

const entityResponse = (message: string, key: string, schema: string) => ({
	type: "object",
	required: ["success", "message", "data"],
	properties: {
		success: { type: "boolean", enum: [true] },
		message: { type: "string", enum: [message] },
		data: {
			type: "object",
			required: [key],
			properties: { [key]: { $ref: `#/components/schemas/${schema}` } },
		},
	},
});

export const adminSchemas = {
	AdminDoctorProfile: {
		type: "object",
		required: ["id", "name", "email", "specialization", "license_number", "status", "created_at", "updated_at"],
		additionalProperties: false,
		properties: {
			id: { type: "string", format: "uuid" },
			name: { type: "string" },
			email: { type: "string", format: "email" },
			specialization: nullableString,
			license_number: { type: "string" },
			status: { $ref: "#/components/schemas/AccountStatus" },
			created_at: dateTime,
			updated_at: dateTime,
		},
	},
	AdminPatientProfile: {
		type: "object",
		required: ["id", "name", "email", "phone", "gender", "birth_date", "status", "created_at", "updated_at"],
		additionalProperties: false,
		properties: {
			id: { type: "string", format: "uuid" },
			name: { type: "string" },
			email: { type: "string", format: "email" },
			phone: { type: "string" },
			gender: nullableString,
			birth_date: { type: "string", format: "date", nullable: true },
			status: { $ref: "#/components/schemas/AccountStatus" },
			created_at: dateTime,
			updated_at: dateTime,
		},
	},
	AdminCreateDoctorRequest: {
		type: "object",
		required: ["name", "email", "password", "license_number"],
		additionalProperties: false,
		properties: {
			name: { type: "string", minLength: 1, maxLength: 255 },
			email: { type: "string", format: "email" },
			password: { type: "string", format: "password", minLength: 8 },
			specialization: { type: "string", minLength: 1, maxLength: 255, nullable: true },
			license_number: { type: "string", minLength: 1, maxLength: 255 },
		},
	},
	AdminUpdateDoctorRequest: {
		type: "object",
		minProperties: 1,
		additionalProperties: false,
		properties: {
			name: { type: "string", minLength: 1, maxLength: 255 },
			email: { type: "string", format: "email" },
			specialization: { type: "string", minLength: 1, maxLength: 255, nullable: true },
			license_number: { type: "string", minLength: 1, maxLength: 255 },
		},
	},
	AdminUpdateAccountStatusRequest: {
		type: "object",
		required: ["status"],
		additionalProperties: false,
		properties: { status: { $ref: "#/components/schemas/AccountStatus" } },
	},
	AdminDoctorListResponse: paginatedResponse("Daftar dokter berhasil diambil.", "AdminDoctorProfile"),
	AdminDoctorCreateResponse: entityResponse("Data dokter berhasil ditambahkan.", "doctor", "AdminDoctorProfile"),
	AdminDoctorDetailResponse: entityResponse("Detail dokter berhasil diambil.", "doctor", "AdminDoctorProfile"),
	AdminDoctorUpdateResponse: entityResponse("Data dokter berhasil diperbarui.", "doctor", "AdminDoctorProfile"),
	AdminDoctorStatusResponse: entityResponse("Status dokter berhasil diperbarui.", "doctor", "AdminDoctorProfile"),
	AdminPatientListResponse: paginatedResponse("Daftar pasien berhasil diambil.", "AdminPatientProfile"),
	AdminPatientDetailResponse: entityResponse("Detail pasien berhasil diambil.", "patient", "AdminPatientProfile"),
	AdminPatientStatusResponse: entityResponse("Status pasien berhasil diperbarui.", "patient", "AdminPatientProfile"),
	AdminConsultationActorSummary: {
		type: "object",
		required: ["id", "name", "email"],
		properties: {
			id: { type: "string", format: "uuid" },
			name: { type: "string" },
			email: { type: "string", format: "email" },
		},
	},
	AdminConsultationListItem: {
		type: "object",
		required: ["id", "patient", "doctor", "status", "created_at", "assigned_at", "reviewed_at", "closed_at", "ai_possible_category", "ai_urgency_level", "ai_confidence_score"],
		properties: {
			id: { type: "string", format: "uuid" },
			patient: { $ref: "#/components/schemas/AdminConsultationActorSummary" },
			doctor: { allOf: [{ $ref: "#/components/schemas/AdminConsultationActorSummary" }], nullable: true },
			status: { $ref: "#/components/schemas/ConsultationStatus" },
			created_at: dateTime,
			assigned_at: { ...dateTime, nullable: true },
			reviewed_at: { ...dateTime, nullable: true },
			closed_at: { ...dateTime, nullable: true },
			ai_possible_category: nullableString,
			ai_urgency_level: { allOf: [{ $ref: "#/components/schemas/UrgencyLevel" }], nullable: true },
			ai_confidence_score: { type: "number", minimum: 0, maximum: 1, nullable: true },
		},
	},
	AdminConsultationListResponse: paginatedResponse("Daftar konsultasi berhasil diambil.", "AdminConsultationListItem"),
	AdminAiAnalysis: {
		type: "object",
		required: ["summary", "detected_symptoms", "duration", "severity_level", "possible_category", "urgency_level", "doctor_note_suggestion", "confidence_score", "model_version", "created_at"],
		additionalProperties: false,
		properties: {
			summary: { type: "string" },
			detected_symptoms: { type: "array", items: { type: "string" } },
			duration: nullableString,
			severity_level: { $ref: "#/components/schemas/SeverityLevel" },
			possible_category: { type: "string" },
			urgency_level: { $ref: "#/components/schemas/UrgencyLevel" },
			doctor_note_suggestion: nullableString,
			confidence_score: { type: "number", minimum: 0, maximum: 1 },
			model_version: { type: "string" },
			created_at: dateTime,
		},
	},
	AdminDoctorReview: {
		type: "object",
		required: ["id", "review_note", "final_category", "final_urgency_level", "recommendation", "created_at", "updated_at"],
		additionalProperties: false,
		properties: {
			id: { type: "string", format: "uuid" },
			review_note: { type: "string" },
			final_category: nullableString,
			final_urgency_level: { allOf: [{ $ref: "#/components/schemas/UrgencyLevel" }], nullable: true },
			recommendation: nullableString,
			created_at: dateTime,
			updated_at: dateTime,
		},
	},
	AdminConsultationDetailResponse: {
		type: "object",
		required: ["success", "message", "data"],
		properties: {
			success: { type: "boolean", enum: [true] },
			message: { type: "string", enum: ["Detail konsultasi berhasil diambil."] },
			data: {
				type: "object",
				required: ["consultation", "patient", "doctor", "ai_analysis", "doctor_review"],
				properties: {
					consultation: {
						type: "object",
						required: ["id", "complaint_text", "status", "assigned_at", "reviewed_at", "closed_at", "created_at", "updated_at"],
						properties: {
							id: { type: "string", format: "uuid" }, complaint_text: { type: "string" }, status: { $ref: "#/components/schemas/ConsultationStatus" },
							assigned_at: { ...dateTime, nullable: true }, reviewed_at: { ...dateTime, nullable: true }, closed_at: { ...dateTime, nullable: true }, created_at: dateTime, updated_at: dateTime,
						},
					},
					patient: { $ref: "#/components/schemas/AdminPatientProfile" },
					doctor: { allOf: [{ $ref: "#/components/schemas/AdminDoctorProfile" }], nullable: true },
					ai_analysis: { allOf: [{ $ref: "#/components/schemas/AdminAiAnalysis" }], nullable: true },
					doctor_review: { allOf: [{ $ref: "#/components/schemas/AdminDoctorReview" }], nullable: true },
				},
			},
		},
	},
	AdminAuditLogItem: {
		type: "object",
		required: ["id", "actor_type", "actor_id", "consultation_id", "action", "description", "ip_address", "user_agent", "created_at"],
		properties: {
			id: { type: "string", format: "uuid" },
			actor_type: { type: "string", enum: ["patient", "doctor", "admin", "system"] },
			actor_id: { type: "string", format: "uuid", nullable: true },
			consultation_id: { type: "string", format: "uuid", nullable: true },
			action: { type: "string" },
			description: nullableString,
			ip_address: nullableString,
			user_agent: nullableString,
			created_at: dateTime,
		},
	},
	AdminAuditLogListResponse: paginatedResponse("Audit log berhasil diambil.", "AdminAuditLogItem"),
} as const;
