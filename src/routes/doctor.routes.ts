import { Router } from "express";

import {
	claimDoctorConsultation,
	closeDoctorConsultation,
	getDoctorConsultationDetail,
	listDoctorConsultations,
	reviewDoctorConsultation,
} from "../controllers/doctorConsultation.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { activeAccountMiddleware } from "../middlewares/activeAccount.middleware";
import { doctorOnly } from "../middlewares/doctorOnly.middleware";
import {
	validateBody,
	validateParams,
	validateQuery,
} from "../middlewares/validation.middleware";
import {
	closeConsultationSchema,
	doctorConsultationListQuerySchema,
	doctorConsultationParamsSchema,
	doctorReviewSchema,
} from "../validators/doctorConsultation.validator";

const router = Router();

router.use(authMiddleware, doctorOnly, activeAccountMiddleware);

router.get(
	"/consultations",
	validateQuery(doctorConsultationListQuerySchema),
	listDoctorConsultations,
);
router.get(
	"/consultations/:id",
	validateParams(doctorConsultationParamsSchema),
	getDoctorConsultationDetail,
);
router.patch(
	"/consultations/:id/claim",
	validateParams(doctorConsultationParamsSchema),
	claimDoctorConsultation,
);
router.patch(
	"/consultations/:id/review",
	validateParams(doctorConsultationParamsSchema),
	validateBody(doctorReviewSchema),
	reviewDoctorConsultation,
);
router.patch(
	"/consultations/:id/status",
	validateParams(doctorConsultationParamsSchema),
	validateBody(closeConsultationSchema),
	closeDoctorConsultation,
);

export default router;
