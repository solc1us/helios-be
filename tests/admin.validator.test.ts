import { describe, expect, test } from "bun:test";

import { AccountStatus, ActorType, ConsultationStatus, UrgencyLevel } from "../src/generated/prisma/enums";
import {
	adminAccountListQuerySchema,
	adminAuditLogListQuerySchema,
	adminConsultationListQuerySchema,
	adminIdParamsSchema,
	createDoctorSchema,
	updateAccountStatusSchema,
	updateDoctorSchema,
} from "../src/validators/admin.validator";

const uuid = "061af019-5542-49f6-978a-78b819c6be3d";

describe("Admin validators", () => {
	test("normalizes Doctor creation input and rejects status or unknown fields", () => {
		const result = createDoctorSchema.parse({
			name: "  dr. Admin Test  ",
			email: " DOCTOR@MAIL.COM ",
			password: "password123",
			specialization: " Pulmonologi ",
			license_number: " SIP-123 ",
		});
		expect(result).toMatchObject({
			name: "dr. Admin Test",
			email: "doctor@mail.com",
			specialization: "Pulmonologi",
			license_number: "SIP-123",
		});
		expect(createDoctorSchema.safeParse({ ...result, status: "active" }).success).toBe(false);
	});

	test("requires a strong enough password and at least one profile update", () => {
		expect(createDoctorSchema.safeParse({ name: "D", email: "d@mail.com", password: "short", license_number: "SIP" }).success).toBe(false);
		expect(updateDoctorSchema.safeParse({}).success).toBe(false);
		expect(updateDoctorSchema.parse({ specialization: null })).toEqual({ specialization: null });
		expect(updateDoctorSchema.safeParse({ password: "password123" }).success).toBe(false);
	});

	test("maps account/list enums and applies pagination defaults", () => {
		expect(updateAccountStatusSchema.parse({ status: "inactive" }).status).toBe(AccountStatus.INACTIVE);
		expect(adminAccountListQuerySchema.parse({ status: "active" })).toEqual({
			status: AccountStatus.ACTIVE,
			page: 1,
			limit: 10,
		});
		expect(adminAccountListQuerySchema.safeParse({ page: 0 }).success).toBe(false);
		expect(adminAccountListQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
	});

	test("validates consultation monitoring filters", () => {
		expect(adminConsultationListQuerySchema.parse({ status: "reviewed", urgency_level: "urgent", patient_id: uuid })).toEqual({
			status: ConsultationStatus.REVIEWED,
			urgency_level: UrgencyLevel.URGENT,
			patient_id: uuid,
			page: 1,
			limit: 10,
		});
		expect(adminConsultationListQuerySchema.safeParse({ doctor_id: "bad" }).success).toBe(false);
	});

	test("validates audit filters and UUID params", () => {
		expect(adminAuditLogListQuerySchema.parse({ actor_type: "admin", actor_id: uuid })).toEqual({
			actor_type: ActorType.ADMIN,
			actor_id: uuid,
			page: 1,
			limit: 10,
		});
		expect(adminIdParamsSchema.safeParse({ id: "not-a-uuid" }).success).toBe(false);
	});
});
