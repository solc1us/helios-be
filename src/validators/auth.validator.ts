import { z } from "zod";

import type {
	EmailLoginInput,
	PatientLoginInput,
	PatientRegistrationInput,
} from "../types/auth.type";

function isValidBirthDate(value: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return false;
	}

	const date = new Date(`${value}T00:00:00.000Z`);

	return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isNotFutureDate(value: string): boolean {
	const today = new Date().toISOString().slice(0, 10);

	return value <= today;
}

export const patientRegistrationSchema: z.ZodType<PatientRegistrationInput> = z
	.object({
		name: z.string().trim().min(1, "Nama wajib diisi."),
		email: z
			.string()
			.trim()
			.email("Email tidak valid.")
			.transform((value) => value.toLowerCase()),
		phone: z.string().trim().min(1, "Nomor telepon wajib diisi."),
		password: z.string().min(8, "Password minimal 8 karakter."),
		gender: z.string().trim().optional(),
		birth_date: z
			.string()
			.refine(isValidBirthDate, "Tanggal lahir tidak valid.")
			.refine(isNotFutureDate, "Tanggal lahir tidak boleh di masa depan.")
			.optional(),
	})
	.strict();

export const patientLoginSchema: z.ZodType<PatientLoginInput> = z
	.object({
		identifier: z
			.string()
			.trim()
			.min(1, "Email atau nomor telepon wajib diisi.")
			.transform((value) =>
				value.includes("@") ? value.toLowerCase() : value,
			),
		password: z.string().min(1, "Password wajib diisi."),
	})
	.strict();

export const emailLoginSchema: z.ZodType<EmailLoginInput> = z
	.object({
		email: z
			.string()
			.trim()
			.email("Email tidak valid.")
			.transform((value) => value.toLowerCase()),
		password: z.string().min(1, "Password wajib diisi."),
	})
	.strict();
