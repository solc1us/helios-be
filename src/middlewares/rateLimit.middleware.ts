import { rateLimit } from "express-rate-limit";

import { env } from "../config/env.config";

export interface RateLimiterOptions {
	windowMs: number;
	max: number;
}

export function createRateLimiter(options: RateLimiterOptions) {
	return rateLimit({
		windowMs: options.windowMs,
		limit: options.max,
		standardHeaders: "draft-7",
		legacyHeaders: false,
		handler: (_req, res) => {
			res.status(429).json({
				success: false,
				message: "Terlalu banyak permintaan. Silakan coba lagi nanti.",
				errors: [],
			});
		},
	});
}

export const authRateLimiter = createRateLimiter({
	windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
	max: env.AUTH_RATE_LIMIT_MAX,
});

export const aiWriteRateLimiter = createRateLimiter({
	windowMs: env.AI_WRITE_RATE_LIMIT_WINDOW_MS,
	max: env.AI_WRITE_RATE_LIMIT_MAX,
});
