const patientProfile = {
	type: "object",
	required: ["id", "name", "email", "phone", "role"],
	additionalProperties: false,
	properties: {
		id: { type: "string", format: "uuid" },
		name: { type: "string", example: "Budi Santoso" },
		email: { type: "string", format: "email", example: "budi@example.com" },
		phone: { type: "string", example: "08123456789" },
		role: { type: "string", enum: ["patient"] },
	},
} as const;

const doctorProfile = {
	type: "object",
	required: [
		"id",
		"name",
		"email",
		"specialization",
		"license_number",
		"role",
	],
	additionalProperties: false,
	properties: {
		id: { type: "string", format: "uuid" },
		name: { type: "string", example: "dr. Ahmad Pratama" },
		email: {
			type: "string",
			format: "email",
			example: "doctor@example.com",
		},
		specialization: {
			type: "string",
			nullable: true,
			example: "Penyakit Dalam",
		},
		license_number: { type: "string", example: "SIP-123456" },
		role: { type: "string", enum: ["doctor"] },
	},
} as const;

const adminProfile = {
	type: "object",
	required: ["id", "name", "email", "role"],
	additionalProperties: false,
	properties: {
		id: { type: "string", format: "uuid" },
		name: { type: "string", example: "Admin Helios" },
		email: { type: "string", format: "email", example: "admin@example.com" },
		role: { type: "string", enum: ["admin"] },
	},
} as const;

function loginResponse(userSchemaReference: string) {
	return {
		type: "object",
		required: ["success", "message", "data"],
		additionalProperties: false,
		properties: {
			success: { type: "boolean", enum: [true] },
			message: { type: "string" },
			data: {
				type: "object",
				required: ["access_token", "token_type", "expires_in", "user"],
				additionalProperties: false,
				properties: {
					access_token: {
						type: "string",
						description: "JWT access token.",
						example: "eyJhbGciOiJIUzI1NiJ9.example.signature",
					},
					token_type: { type: "string", enum: ["Bearer"] },
					expires_in: {
						type: "integer",
						minimum: 1,
						example: 86400,
					},
					user: { $ref: userSchemaReference },
				},
			},
		},
	};
}

export const authSchemas = {
	PatientProfile: patientProfile,
	DoctorProfile: doctorProfile,
	AdminProfile: adminProfile,
	PatientRegisterRequest: {
		type: "object",
		required: ["name", "email", "phone", "password"],
		additionalProperties: false,
		properties: {
			name: { type: "string", minLength: 1, example: "Budi Santoso" },
			email: {
				type: "string",
				format: "email",
				example: "budi@example.com",
			},
			phone: { type: "string", minLength: 1, example: "08123456789" },
			password: {
				type: "string",
				format: "password",
				minLength: 8,
				example: "example-password",
			},
			gender: { type: "string", example: "male" },
			birth_date: { type: "string", format: "date", example: "2001-05-10" },
		},
	},
	PatientRegisterResponse: {
		type: "object",
		required: ["success", "message", "data"],
		additionalProperties: false,
		properties: {
			success: { type: "boolean", enum: [true] },
			message: { type: "string", enum: ["Registrasi pasien berhasil."] },
			data: {
				type: "object",
				required: ["patient"],
				additionalProperties: false,
				properties: {
					patient: {
						type: "object",
						required: ["id", "name", "email", "phone", "status"],
						additionalProperties: false,
						properties: {
							id: { type: "string", format: "uuid" },
							name: { type: "string" },
							email: { type: "string", format: "email" },
							phone: { type: "string" },
							status: { $ref: "#/components/schemas/AccountStatus" },
						},
					},
				},
			},
		},
	},
	PatientLoginRequest: {
		type: "object",
		required: ["identifier", "password"],
		additionalProperties: false,
		properties: {
			identifier: {
				type: "string",
				minLength: 1,
				description: "Patient email address or phone number.",
				example: "budi@example.com",
			},
			password: {
				type: "string",
				format: "password",
				minLength: 1,
				example: "example-password",
			},
		},
	},
	DoctorLoginRequest: {
		type: "object",
		required: ["email", "password"],
		additionalProperties: false,
		properties: {
			email: {
				type: "string",
				format: "email",
				example: "doctor@example.com",
			},
			password: {
				type: "string",
				format: "password",
				minLength: 1,
				example: "example-password",
			},
		},
	},
	AdminLoginRequest: {
		type: "object",
		required: ["email", "password"],
		additionalProperties: false,
		properties: {
			email: {
				type: "string",
				format: "email",
				example: "admin@example.com",
			},
			password: {
				type: "string",
				format: "password",
				minLength: 1,
				example: "example-password",
			},
		},
	},
	PatientLoginResponse: loginResponse("#/components/schemas/PatientProfile"),
	DoctorLoginResponse: loginResponse("#/components/schemas/DoctorProfile"),
	AdminLoginResponse: loginResponse("#/components/schemas/AdminProfile"),
	AuthenticatedAccountResponse: {
		type: "object",
		required: ["success", "message", "data"],
		additionalProperties: false,
		properties: {
			success: { type: "boolean", enum: [true] },
			message: { type: "string", enum: ["Data akun berhasil diambil."] },
			data: {
				type: "object",
				required: ["user"],
				additionalProperties: false,
				properties: {
					user: {
						oneOf: [
							{ $ref: "#/components/schemas/PatientProfile" },
							{ $ref: "#/components/schemas/DoctorProfile" },
							{ $ref: "#/components/schemas/AdminProfile" },
						],
					},
				},
			},
		},
	},
} as const;
