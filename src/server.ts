import app from "./app";
import { env } from "./config/env.config";
import { prisma } from "./config/database.config";
import { logger } from "./utils/logger";

const server = app.listen(env.PORT, () => {
	logger.info(`Helios backend running on http://localhost:${env.PORT}`);
});

async function shutdown(signal: string) {
	logger.info(
		{
			signal,
		},
		"Shutting down Helios backend",
	);

	server.close(async () => {
		await prisma.$disconnect();

		logger.info("Database disconnected");

		process.exit(0);
	});
}

process.on("SIGINT", () => {
	void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
	void shutdown("SIGTERM");
});
