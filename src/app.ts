import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";

import { env } from "./config/env.config";
import { setupSwagger } from "./config/swagger.config";
import { errorHandler } from "./middlewares/error.middleware";
import routes from "./routes";
import { logger } from "./utils/logger";

const app = express();

app.disable("x-powered-by");

app.use(helmet());

app.use(
	cors({
		origin: env.CORS_ORIGIN,
	}),
);

app.use(
	express.json({
		limit: "100kb",
	}),
);

app.use(
	pinoHttp({
		logger,
	}),
);

setupSwagger(app);

app.use("/api/v1", routes);

app.use((_req, res) => {
	res.status(404).json({
		success: false,
		message: "Endpoint tidak ditemukan.",
		errors: [],
	});
});

app.use(errorHandler);

export default app;
