import type { ErrorRequestHandler } from "express";

import { logger } from "../utils/logger";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
	logger.error(
		{
			err: error,
		},
		"Unhandled application error",
	);

	res.status(500).json({
		success: false,
		message: "Terjadi kesalahan pada sistem.",
		errors: [],
	});
};
