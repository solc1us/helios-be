import { jwtVerify, SignJWT } from "jose";

import { env } from "../config/env.config";
import { isAuthRole } from "../constants/roles";
import type { AccessTokenResult, AuthContext } from "../types/auth.type";

const durationMultipliers = {
	s: 1,
	m: 60,
	h: 60 * 60,
	d: 24 * 60 * 60,
	w: 7 * 24 * 60 * 60,
} as const;

export interface SignAccessTokenOptions {
	expiresIn?: string;
	issuedAt?: number;
}

export function parseTokenExpiration(expiresIn: string): number {
	if (/^\d+$/.test(expiresIn)) {
		const seconds = Number(expiresIn);

		if (seconds > 0) {
			return seconds;
		}
	}

	const match = /^(\d+)([smhdw])$/i.exec(expiresIn);

	if (!match) {
		throw new Error("JWT_EXPIRES_IN must be a positive duration such as 24h.");
	}

	const amount = Number(match[1]);
	const unit = match[2]?.toLowerCase() as keyof typeof durationMultipliers;
	const seconds = amount * durationMultipliers[unit];

	if (seconds <= 0) {
		throw new Error("JWT_EXPIRES_IN must be greater than zero.");
	}

	return seconds;
}

function jwtSecret(): Uint8Array {
	return new TextEncoder().encode(env.JWT_SECRET);
}

export async function generateAccessToken(
	auth: AuthContext,
	options: SignAccessTokenOptions = {},
): Promise<AccessTokenResult> {
	const expiresIn = parseTokenExpiration(
		options.expiresIn ?? env.JWT_EXPIRES_IN,
	);
	const issuedAt = options.issuedAt ?? Math.floor(Date.now() / 1000);
	const accessToken = await new SignJWT({ role: auth.role })
		.setProtectedHeader({ alg: "HS256", typ: "JWT" })
		.setSubject(auth.id)
		.setIssuedAt(issuedAt)
		.setExpirationTime(issuedAt + expiresIn)
		.sign(jwtSecret());

	return { accessToken, expiresIn };
}

export async function verifyAccessToken(token: string): Promise<AuthContext> {
	const { payload } = await jwtVerify(token, jwtSecret(), {
		algorithms: ["HS256"],
	});

	if (
		typeof payload.sub !== "string" ||
		payload.sub.length === 0 ||
		!isAuthRole(payload.role)
	) {
		throw new Error("Invalid access token payload.");
	}

	return {
		id: payload.sub,
		role: payload.role,
	};
}
