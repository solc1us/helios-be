export const healthPaths = {
	"/api/v1/health": {
		get: {
			tags: ["System"],
			summary: "Health check",
			description: "Checks API availability and the PostgreSQL connection.",
			operationId: "getHealth",
			responses: {
				"200": {
					description: "Service and database are healthy.",
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/HealthSuccessResponse" },
						},
					},
				},
				"503": {
					description: "Service cannot connect to the database.",
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/HealthFailureResponse" },
						},
					},
				},
			},
		},
	},
} as const;
