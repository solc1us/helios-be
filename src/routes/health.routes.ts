import { Router } from "express";

import { prisma } from "../config/database.config";

const router = Router();

router.get("/", async (_req, res) => {
	try {
		await prisma.$queryRaw`SELECT 1`;

		res.status(200).json({
			success: true,
			message: "Service healthy.",
			data: {
				status: "healthy",
				database: "connected",
			},
		});
	} catch {
		res.status(503).json({
			success: false,
			message: "Service unhealthy.",
			data: {
				status: "unhealthy",
				database: "disconnected",
			},
		});
	}
});

export default router;
