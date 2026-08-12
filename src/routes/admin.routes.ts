import { Router } from "express";

import {
	createAdminDoctor,
	getAdminConsultation,
	getAdminDoctor,
	getAdminPatient,
	listAdminAuditLogs,
	listAdminConsultations,
	listAdminDoctors,
	listAdminPatients,
	updateAdminDoctor,
	updateAdminDoctorStatus,
	updateAdminPatientStatus,
} from "../controllers/admin.controller";
import { adminOnly } from "../middlewares/adminOnly.middleware";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validateBody, validateParams, validateQuery } from "../middlewares/validation.middleware";
import {
	adminAccountListQuerySchema,
	adminAuditLogListQuerySchema,
	adminConsultationListQuerySchema,
	adminIdParamsSchema,
	createDoctorSchema,
	updateAccountStatusSchema,
	updateDoctorSchema,
} from "../validators/admin.validator";

const router = Router();

router.use(authMiddleware, adminOnly);

router.get("/doctors", validateQuery(adminAccountListQuerySchema), listAdminDoctors);
router.post("/doctors", validateBody(createDoctorSchema), createAdminDoctor);
router.get("/doctors/:id", validateParams(adminIdParamsSchema), getAdminDoctor);
router.patch(
	"/doctors/:id",
	validateParams(adminIdParamsSchema),
	validateBody(updateDoctorSchema),
	updateAdminDoctor,
);
router.patch(
	"/doctors/:id/status",
	validateParams(adminIdParamsSchema),
	validateBody(updateAccountStatusSchema),
	updateAdminDoctorStatus,
);

router.get("/patients", validateQuery(adminAccountListQuerySchema), listAdminPatients);
router.get("/patients/:id", validateParams(adminIdParamsSchema), getAdminPatient);
router.patch(
	"/patients/:id/status",
	validateParams(adminIdParamsSchema),
	validateBody(updateAccountStatusSchema),
	updateAdminPatientStatus,
);

router.get(
	"/consultations",
	validateQuery(adminConsultationListQuerySchema),
	listAdminConsultations,
);
router.get(
	"/consultations/:id",
	validateParams(adminIdParamsSchema),
	getAdminConsultation,
);
router.get(
	"/audit-logs",
	validateQuery(adminAuditLogListQuerySchema),
	listAdminAuditLogs,
);

export default router;
