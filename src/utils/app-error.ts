export interface ErrorDetail {
	field: string;
	message: string;
}

export class AppError extends Error {
	constructor(
		public readonly statusCode: number,
		message: string,
		public readonly errors: ErrorDetail[] = [],
	) {
		super(message);
		this.name = "AppError";
	}
}
