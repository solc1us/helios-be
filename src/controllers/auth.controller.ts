import type { RequestHandler } from "express";

import { authService } from "../services/auth.service";
import type {
	EmailLoginInput,
	PatientLoginInput,
	PatientRegistrationInput,
} from "../types/auth.type";

export const registerPatient: RequestHandler = async (req, res) => {
	const data = await authService.registerPatient(
		req.body as PatientRegistrationInput,
	);

	res.status(201).json({
		success: true,
		message: "Registrasi pasien berhasil.",
		data,
	});
};

export const loginPatient: RequestHandler = async (req, res) => {
	const data = await authService.loginPatient(req.body as PatientLoginInput);

	res.status(200).json({
		success: true,
		message: "Login pasien berhasil.",
		data,
	});
};

export const loginDoctor: RequestHandler = async (req, res) => {
	const data = await authService.loginDoctor(req.body as EmailLoginInput);

	res.status(200).json({
		success: true,
		message: "Login dokter berhasil.",
		data,
	});
};

export const loginAdmin: RequestHandler = async (req, res) => {
	const data = await authService.loginAdmin(req.body as EmailLoginInput);

	res.status(200).json({
		success: true,
		message: "Login admin berhasil.",
		data,
	});
};

export const getCurrentAccount: RequestHandler = async (req, res) => {
	const data = await authService.getCurrentAccount(req.auth!);

	res.status(200).json({
		success: true,
		message: "Data akun berhasil diambil.",
		data,
	});
};
