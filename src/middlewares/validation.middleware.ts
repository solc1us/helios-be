import type { RequestHandler } from "express";
import type { ZodType } from "zod";

import { AppError } from "../utils/app-error";

type ValidationSource = "body" | "query" | "params";

function validate(schema: ZodType, source: ValidationSource): RequestHandler {
	return (req, res, next) => {
		const result = schema.safeParse(req[source]);

		if (!result.success) {
			const errors = result.error.issues.map((issue) => ({
				field: issue.path.join(".") || "body",
				message: issue.message,
			}));

			next(new AppError(422, "Validasi gagal.", errors));
			return;
		}

		if (source === "body") {
			req.body = result.data;
		} else if (source === "query") {
			res.locals.validatedQuery = result.data;
		} else {
			res.locals.validatedParams = result.data;
		}

		next();
	};
}

export function validateBody(schema: ZodType): RequestHandler {
	return validate(schema, "body");
}

export function validateQuery(schema: ZodType): RequestHandler {
	return validate(schema, "query");
}

export function validateParams(schema: ZodType): RequestHandler {
	return validate(schema, "params");
}
