import { Router } from "express";

import authRoutes from "./auth.routes";
import doctorRoutes from "./doctor.routes";
import healthRoutes from "./health.routes";
import patientRoutes from "./patient.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/health", healthRoutes);
router.use("/patient", patientRoutes);
router.use("/doctor", doctorRoutes);

export default router;
