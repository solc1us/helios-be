import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";

const app = express();

app.use(helmet());

app.use(
	cors({
		origin: process.env.CORS_ORIGIN,
		credentials: true,
	}),
);

app.use(express.json());

app.use(
	pinoHttp({
		autoLogging: true,
	}),
);

app.get("/api/v1/health", (_req, res) => {
	res.status(200).json({
		success: true,
		message: "Service healthy.",
		data: {
			status: "healthy",
		},
	});
});

export default app;
