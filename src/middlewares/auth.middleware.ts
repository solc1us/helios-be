import type { RequestHandler } from "express";

import { AppError } from "../utils/app-error";
import { verifyAccessToken } from "../utils/token";

const bearerTokenPattern = /^Bearer\s+([^\s]+)$/i;

export const authMiddleware: RequestHandler = async (req, _res, next) => {
	const authorization = req.get("authorization");
	const token = authorization?.match(bearerTokenPattern)?.[1];

	if (!token) {
		next(new AppError(401, "Token autentikasi diperlukan."));
		return;
	}

	try {
		req.auth = await verifyAccessToken(token);
		next();
	} catch {
		next(new AppError(401, "Token autentikasi tidak valid."));
	}
};
