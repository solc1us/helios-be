const nullableString = { type: "string", nullable: true } as const;

export const doctorConsultationSchemas = {
	DoctorAiAnalysis: {
		type: "object",
		required: [
			"summary",
			"detected_symptoms",
			"duration",
			"severity_level",
			"possible_category",
			"urgency_level",
			"doctor_note_suggestion",
			"confidence_score",
			"model_version",
		],
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
			model_version: { type: "string", example: "dummy-v1" },
		},
	},
	DoctorReview: {
		type: "object",
		required: [
			"id",
			"review_note",
			"final_category",
			"final_urgency_level",
			"recommendation",
			"created_at",
		],
		additionalProperties: false,
		properties: {
			id: { type: "string", format: "uuid" },
			review_note: { type: "string" },
			final_category: nullableString,
			final_urgency_level: {
				allOf: [{ $ref: "#/components/schemas/UrgencyLevel" }],
				nullable: true,
			},
			recommendation: nullableString,
			created_at: { type: "string", format: "date-time" },
		},
	},
	PatientSafeDoctorReview: {
		type: "object",
		required: [
			"final_category",
			"final_urgency_level",
			"recommendation",
			"reviewed_at",
		],
		additionalProperties: false,
		properties: {
			final_category: nullableString,
			final_urgency_level: {
				allOf: [{ $ref: "#/components/schemas/UrgencyLevel" }],
				nullable: true,
			},
			recommendation: nullableString,
			reviewed_at: { type: "string", format: "date-time", nullable: true },
		},
	},
	DoctorConsultationListResponse: {
		type: "object",
		required: ["success", "message", "data"],
		properties: {
			success: { type: "boolean", enum: [true] },
			message: { type: "string", enum: ["Daftar konsultasi berhasil diambil."] },
			data: {
				type: "object",
				required: ["items", "pagination"],
				properties: {
					items: {
						type: "array",
						items: {
							type: "object",
							required: [
								"id",
								"complaint_text",
								"status",
								"created_at",
								"assigned_at",
								"ai_summary",
								"possible_category",
								"urgency_level",
								"confidence_score",
							],
							properties: {
								id: { type: "string", format: "uuid" },
								complaint_text: { type: "string", description: "100-character preview." },
								status: { $ref: "#/components/schemas/ConsultationStatus" },
								created_at: { type: "string", format: "date-time" },
								assigned_at: { type: "string", format: "date-time", nullable: true },
								ai_summary: nullableString,
								possible_category: nullableString,
								urgency_level: { type: "string", nullable: true, enum: ["normal", "priority", "urgent"] },
								confidence_score: { type: "number", nullable: true, minimum: 0, maximum: 1 },
							},
						},
					},
					pagination: { $ref: "#/components/schemas/Pagination" },
				},
			},
		},
	},
	DoctorConsultationDetailResponse: {
		type: "object",
		required: ["success", "message", "data"],
		properties: {
			success: { type: "boolean", enum: [true] },
			message: { type: "string", enum: ["Detail konsultasi berhasil diambil."] },
			data: {
				type: "object",
				required: ["consultation", "patient", "ai_analysis", "doctor_review"],
				properties: {
					consultation: {
						type: "object",
						required: ["id", "complaint_text", "status", "assigned_at", "reviewed_at", "closed_at", "created_at", "updated_at"],
						properties: {
							id: { type: "string", format: "uuid" },
							complaint_text: { type: "string" },
							status: { $ref: "#/components/schemas/ConsultationStatus" },
							assigned_at: { type: "string", format: "date-time", nullable: true },
							reviewed_at: { type: "string", format: "date-time", nullable: true },
							closed_at: { type: "string", format: "date-time", nullable: true },
							created_at: { type: "string", format: "date-time" },
							updated_at: { type: "string", format: "date-time" },
						},
					},
					patient: {
						type: "object",
						required: ["id", "name", "gender", "birth_date"],
						properties: {
							id: { type: "string", format: "uuid" },
							name: { type: "string" },
							gender: nullableString,
							birth_date: { type: "string", format: "date", nullable: true },
						},
					},
					ai_analysis: { allOf: [{ $ref: "#/components/schemas/DoctorAiAnalysis" }], nullable: true },
					doctor_review: { allOf: [{ $ref: "#/components/schemas/DoctorReview" }], nullable: true },
				},
			},
		},
	},
	DoctorReviewRequest: {
		type: "object",
		required: ["review_note"],
		additionalProperties: false,
		properties: {
			review_note: { type: "string", minLength: 1, maxLength: 5000 },
			final_category: { type: "string", minLength: 1, maxLength: 255, nullable: true },
			final_urgency_level: { type: "string", nullable: true, enum: ["normal", "priority", "urgent"] },
			recommendation: { type: "string", maxLength: 5000, nullable: true },
		},
	},
	DoctorReviewResponse: {
		type: "object",
		required: ["success", "message", "data"],
		properties: {
			success: { type: "boolean", enum: [true] },
			message: { type: "string", enum: ["Review dokter berhasil disimpan."] },
			data: {
				type: "object",
				required: ["review", "consultation_status"],
				properties: {
					review: { $ref: "#/components/schemas/DoctorReview" },
					consultation_status: { type: "string", enum: ["reviewed"] },
				},
			},
		},
	},
	DoctorClaimResponse: {
		type: "object",
		required: ["success", "message", "data"],
		properties: {
			success: { type: "boolean", enum: [true] },
			message: { type: "string", enum: ["Konsultasi berhasil diambil."] },
			data: {
				type: "object",
				properties: {
					consultation: {
						type: "object",
						required: ["id", "doctor_id", "status", "assigned_at"],
						properties: {
							id: { type: "string", format: "uuid" },
							doctor_id: { type: "string", format: "uuid" },
							status: { type: "string", enum: ["in_review"] },
							assigned_at: { type: "string", format: "date-time" },
						},
					},
				},
			},
		},
	},
	CloseConsultationRequest: {
		type: "object",
		required: ["status"],
		additionalProperties: false,
		properties: { status: { type: "string", enum: ["closed"] } },
	},
	CloseConsultationResponse: {
		type: "object",
		required: ["success", "message", "data"],
		properties: {
			success: { type: "boolean", enum: [true] },
			message: { type: "string", enum: ["Konsultasi berhasil ditutup."] },
			data: {
				type: "object",
				properties: {
					consultation: {
						type: "object",
						required: ["id", "status", "closed_at"],
						properties: {
							id: { type: "string", format: "uuid" },
							status: { type: "string", enum: ["closed"] },
							closed_at: { type: "string", format: "date-time" },
						},
					},
				},
			},
		},
	},
} as const;
