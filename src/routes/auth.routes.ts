import { Router } from "express";

import {
	getCurrentAccount,
	loginAdmin,
	loginDoctor,
	loginPatient,
	registerPatient,
} from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validation.middleware";
import {
	emailLoginSchema,
	patientLoginSchema,
	patientRegistrationSchema,
} from "../validators/auth.validator";

const router = Router();

router.post(
	"/patient/register",
	validateBody(patientRegistrationSchema),
	registerPatient,
);
router.post(
	"/patient/login",
	validateBody(patientLoginSchema),
	loginPatient,
);
router.post("/doctor/login", validateBody(emailLoginSchema), loginDoctor);
router.post("/admin/login", validateBody(emailLoginSchema), loginAdmin);
router.get("/me", authMiddleware, getCurrentAccount);

export default router;
