import { Router } from "express";

import {
	createPatientConsultation,
	getPatientConsultationDetail,
	listPatientConsultations,
} from "../controllers/patientConsultation.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { activeAccountMiddleware } from "../middlewares/activeAccount.middleware";
import { aiWriteRateLimiter } from "../middlewares/rateLimit.middleware";
import { patientOnly } from "../middlewares/patientOnly.middleware";
import {
	validateBody,
	validateParams,
	validateQuery,
} from "../middlewares/validation.middleware";
import {
	consultationDetailParamsSchema,
	consultationListQuerySchema,
	createConsultationSchema,
} from "../validators/consultation.validator";

const router = Router();

router.use(authMiddleware, patientOnly, activeAccountMiddleware);

router.post(
	"/consultations",
	aiWriteRateLimiter,
	validateBody(createConsultationSchema),
	createPatientConsultation,
);
router.get(
	"/consultations",
	validateQuery(consultationListQuerySchema),
	listPatientConsultations,
);
router.get(
	"/consultations/:id",
	validateParams(consultationDetailParamsSchema),
	getPatientConsultationDetail,
);

export default router;
