import type { ErrorRequestHandler } from "express";

import { AppError } from "../utils/app-error";
import { logger } from "../utils/logger";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
	if (error instanceof AppError) {
		res.status(error.statusCode).json({
			success: false,
			message: error.message,
			errors: error.errors,
		});
		return;
	}

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
