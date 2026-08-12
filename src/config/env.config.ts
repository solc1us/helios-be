import { z } from "zod";

const envSchema = z.object({
	NODE_ENV: z
		.enum(["development", "test", "production"])
		.default("development"),

	PORT: z.coerce.number().int().positive().default(3001),

	DATABASE_URL: z.string().min(1),

	JWT_SECRET: z.string().min(32),

	JWT_EXPIRES_IN: z.string().default("24h"),

	CORS_ORIGIN: z.string().url(),

	LOG_LEVEL: z.string().default("info"),

	AUTH_RATE_LIMIT_WINDOW_MS: z.coerce
		.number()
		.int()
		.positive()
		.default(15 * 60 * 1000),

	AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),

	AI_WRITE_RATE_LIMIT_WINDOW_MS: z.coerce
		.number()
		.int()
		.positive()
		.default(60 * 1000),

	AI_WRITE_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	console.error("Invalid environment variables:");

	console.error(z.prettifyError(parsed.error));

	process.exit(1);
}

export const env = parsed.data;
