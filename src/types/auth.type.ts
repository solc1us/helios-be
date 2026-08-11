import type { AuthRole } from "../constants/roles";

export interface AuthContext {
	id: string;
	role: AuthRole;
}

export interface PatientRegistrationInput {
	name: string;
	email: string;
	phone: string;
	password: string;
	gender?: string;
	birth_date?: string;
}

export interface PatientLoginInput {
	identifier: string;
	password: string;
}

export interface EmailLoginInput {
	email: string;
	password: string;
}

export interface AccessTokenResult {
	accessToken: string;
	expiresIn: number;
}
