import type { RequestHandler } from "express";

import type { AuthRole } from "../constants/roles";
import { AppError } from "../utils/app-error";

export function requireRole(role: AuthRole): RequestHandler {
	return (req, _res, next) => {
		if (!req.auth) {
			next(new AppError(401, "Autentikasi diperlukan."));
			return;
		}

		if (req.auth.role !== role) {
			next(new AppError(403, "Anda tidak memiliki akses."));
			return;
		}

		next();
	};
}
