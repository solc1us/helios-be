export const ROLES = {
	PATIENT: "patient",
	DOCTOR: "doctor",
	ADMIN: "admin",
} as const;

export type AuthRole = (typeof ROLES)[keyof typeof ROLES];

const authRoles = new Set<string>(Object.values(ROLES));

export function isAuthRole(value: unknown): value is AuthRole {
	return typeof value === "string" && authRoles.has(value);
}
