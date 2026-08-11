import type { RequestHandler } from "express";
import type { ZodType } from "zod";

import { AppError } from "../utils/app-error";

export function validateBody(schema: ZodType): RequestHandler {
	return (req, _res, next) => {
		const result = schema.safeParse(req.body);

		if (!result.success) {
			const errors = result.error.issues.map((issue) => ({
				field: issue.path.join(".") || "body",
				message: issue.message,
			}));

			next(new AppError(422, "Validasi gagal.", errors));
			return;
		}

		req.body = result.data;
		next();
	};
}
