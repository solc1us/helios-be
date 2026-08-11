import type { Express } from "express";
import swaggerUi from "swagger-ui-express";

import { openApiDocument } from "../docs/openapi";
import { env } from "./env.config";

export const swaggerEnabled = env.NODE_ENV !== "production";

const swaggerUiOptions = {
	customSiteTitle: "Helios Backend API",
	swaggerOptions: {
		displayRequestDuration: true,
		persistAuthorization: true,
	},
};

export function setupSwagger(app: Express): void {
	if (!swaggerEnabled) return;

	app.get("/openapi.json", (_req, res) => {
		res.json(openApiDocument);
	});

	const swaggerHtml = swaggerUi
		.generateHTML(openApiDocument, swaggerUiOptions)
		.replace("<head>", '<head><base href="/api-docs/">');

	app.get("/api-docs", (_req, res) => {
		res.type("html").send(swaggerHtml);
	});

	app.use(
		"/api-docs",
		swaggerUi.serveFiles(openApiDocument, swaggerUiOptions),
		swaggerUi.setup(openApiDocument, swaggerUiOptions),
	);
}
