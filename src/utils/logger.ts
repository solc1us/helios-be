import pino, { type DestinationStream, type LoggerOptions } from "pino";

import { env } from "../config/env.config";

export const sensitiveLogPaths = [
	"req.headers.authorization",
	"req.headers.cookie",
	"req.body.password",
	"req.body.passwordHash",
	"req.body.password_hash",
	"req.body.complaint_text",
	"req.body.summary",
	"req.body.detected_symptoms",
	"req.body.review_note",
	"req.body.recommendation",
	"req.body.rawOutput",
	"req.body.raw_output",
	"authorization",
	"access_token",
	"password",
	"passwordHash",
	"password_hash",
	"complaint_text",
	"review_note",
	"recommendation",
	"rawOutput",
	"raw_output",
	"JWT_SECRET",
	"DATABASE_URL",
] as const;

const loggerOptions: LoggerOptions = {
	level: env.LOG_LEVEL,
	redact: {
		paths: [...sensitiveLogPaths],
		censor: "[REDACTED]",
	},
};

export function createLogger(destination?: DestinationStream) {
	return destination ? pino(loggerOptions, destination) : pino(loggerOptions);
}

export const requestLoggerOptions = {
	serializers: {
		req(request: {
			method?: string;
			url?: string;
			remoteAddress?: string;
		}) {
			return {
				method: request.method,
				url: request.url,
				remoteAddress: request.remoteAddress,
			};
		},
		res(response: { statusCode?: number }) {
			return { statusCode: response.statusCode };
		},
	},
} as const;

export const logger = createLogger();
