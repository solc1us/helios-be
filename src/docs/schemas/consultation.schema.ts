export const consultationSchemas = {
	ConsultationCreateRequest: {
		type: "object",
		required: ["complaint_text"],
		additionalProperties: false,
		properties: {
			complaint_text: {
				type: "string",
				minLength: 10,
				maxLength: 5000,
				description: "Health complaint. Surrounding whitespace is trimmed.",
				example: "Saya demam dan batuk sejak tiga hari lalu.",
			},
		},
	},
	ConsultationCreatedResponse: {
		type: "object",
		required: ["success", "message", "data"],
		additionalProperties: false,
		properties: {
			success: { type: "boolean", enum: [true] },
			message: { type: "string", enum: ["Konsultasi berhasil dibuat."] },
			data: {
				type: "object",
				required: ["consultation"],
				additionalProperties: false,
				properties: {
					consultation: {
						type: "object",
						required: ["id", "complaint_text", "status", "created_at"],
						additionalProperties: false,
						properties: {
							id: { type: "string", format: "uuid" },
							complaint_text: { type: "string" },
							status: { type: "string", enum: ["submitted"] },
							created_at: { type: "string", format: "date-time" },
						},
					},
				},
			},
		},
	},
	PatientConsultationListItem: {
		type: "object",
		required: [
			"id",
			"complaint_text",
			"status",
			"created_at",
			"category",
			"confidence_score",
		],
		additionalProperties: false,
		properties: {
			id: { type: "string", format: "uuid" },
			complaint_text: {
				type: "string",
				description:
					"Full complaint up to 100 characters, otherwise the first 100 characters followed by an ellipsis.",
			},
			status: { $ref: "#/components/schemas/ConsultationStatus" },
			created_at: { type: "string", format: "date-time" },
			category: {
				type: "string",
				nullable: true,
				description:
					"Doctor-confirmed final category for reviewed or closed consultations; never an unconfirmed AI category.",
				example: "keluhan pernapasan",
			},
			confidence_score: {
				type: "number",
				format: "double",
				nullable: true,
				description:
					"AI confidence exposed only after the consultation is reviewed or closed.",
				example: 0.82,
			},
		},
	},
	DashboardStatistics: {
		type: "object",
		required: [
			"this_month",
			"best_confidence",
			"top_diagnosis",
			"distribution",
		],
		additionalProperties: false,
		description:
			"Patient-wide statistics independent of list pagination and status filtering.",
		properties: {
			this_month: {
				type: "integer",
				minimum: 0,
				description:
					"All patient consultations created during the current UTC calendar month.",
				example: 4,
			},
			best_confidence: {
				type: "number",
				format: "double",
				nullable: true,
				description:
					"Highest confidence among the patient's reviewed or closed consultations.",
				example: 0.87,
			},
			top_diagnosis: {
				type: "string",
				nullable: true,
				description:
					"Most frequent doctor-confirmed final category; alphabetical ascending resolves equal counts.",
				example: "keluhan pernapasan",
			},
			distribution: {
				type: "object",
				description: "Counts of doctor-confirmed final categories.",
				additionalProperties: { type: "integer", minimum: 0 },
				example: {
					"keluhan pernapasan": 3,
					"keluhan pencernaan": 1,
				},
			},
		},
	},
	PatientConsultationListResponse: {
		type: "object",
		required: ["success", "message", "data"],
		additionalProperties: false,
		properties: {
			success: { type: "boolean", enum: [true] },
			message: {
				type: "string",
				enum: ["Riwayat konsultasi berhasil diambil."],
			},
			data: {
				type: "object",
				required: ["items", "pagination", "statistics"],
				additionalProperties: false,
				properties: {
					items: {
						type: "array",
						items: {
							$ref: "#/components/schemas/PatientConsultationListItem",
						},
					},
					pagination: { $ref: "#/components/schemas/Pagination" },
					statistics: {
						$ref: "#/components/schemas/DashboardStatistics",
					},
				},
			},
		},
	},
	PatientConsultationDetailResponse: {
		type: "object",
		required: ["success", "message", "data"],
		additionalProperties: false,
		properties: {
			success: { type: "boolean", enum: [true] },
			message: {
				type: "string",
				enum: ["Detail konsultasi berhasil diambil."],
			},
			data: {
				type: "object",
				required: ["consultation", "doctor_review"],
				additionalProperties: false,
				properties: {
					consultation: {
						type: "object",
						required: [
							"id",
							"complaint_text",
							"status",
							"created_at",
							"updated_at",
						],
						additionalProperties: false,
						properties: {
							id: { type: "string", format: "uuid" },
							complaint_text: { type: "string" },
							status: {
								$ref: "#/components/schemas/ConsultationStatus",
							},
							created_at: { type: "string", format: "date-time" },
							updated_at: { type: "string", format: "date-time" },
						},
					},
					doctor_review: {
						type: "object",
						nullable: true,
						additionalProperties: false,
						description:
							"Currently null in the implemented Patient Consultation detail response.",
						example: null,
					},
				},
			},
		},
	},
} as const;
