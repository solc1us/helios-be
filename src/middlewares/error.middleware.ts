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

	if (
		typeof error === "object" &&
		error !== null &&
		"type" in error &&
		error.type === "entity.too.large"
	) {
		res.status(413).json({
			success: false,
			message: "Payload request terlalu besar.",
			errors: [],
		});
		return;
	}

	if (
		error instanceof SyntaxError &&
		"type" in error &&
		error.type === "entity.parse.failed"
	) {
		res.status(400).json({
			success: false,
			message: "Format JSON tidak valid.",
			errors: [],
		});
		return;
	}

	logger.error(
		{
			errorName: error instanceof Error ? error.name : "UnknownError",
			errorCode:
				typeof error === "object" &&
				error !== null &&
				"code" in error &&
				typeof error.code === "string"
					? error.code
					: undefined,
		},
		"Unhandled application error",
	);

	res.status(500).json({
		success: false,
		message: "Terjadi kesalahan pada sistem.",
		errors: [],
	});
};
