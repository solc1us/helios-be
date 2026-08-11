import type { AuthContext } from "./auth.type";

declare global {
	namespace Express {
		interface Request {
			auth?: AuthContext;
		}
	}
}

export {};
