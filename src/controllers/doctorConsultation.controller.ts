import type { RequestHandler } from "express";

import { doctorConsultationService } from "../services/doctorConsultation.service";
import type {
	DoctorConsultationListQuery,
	DoctorConsultationParams,
	DoctorReviewInput,
} from "../types/doctorConsultation.type";

export const listDoctorConsultations: RequestHandler = async (req, res) => {
	const data = await doctorConsultationService.list(
		req.auth!.id,
		res.locals.validatedQuery as DoctorConsultationListQuery,
	);

	res.status(200).json({
		success: true,
		message: "Daftar konsultasi berhasil diambil.",
		data,
	});
};

export const getDoctorConsultationDetail: RequestHandler = async (req, res) => {
	const { id } = res.locals.validatedParams as DoctorConsultationParams;
	const data = await doctorConsultationService.getDetail(id, req.auth!.id);

	res.status(200).json({
		success: true,
		message: "Detail konsultasi berhasil diambil.",
		data,
	});
};

export const claimDoctorConsultation: RequestHandler = async (req, res) => {
	const { id } = res.locals.validatedParams as DoctorConsultationParams;
	const data = await doctorConsultationService.claim(id, req.auth!.id);

	res.status(200).json({
		success: true,
		message: "Konsultasi berhasil diambil.",
		data,
	});
};

export const reviewDoctorConsultation: RequestHandler = async (req, res) => {
	const { id } = res.locals.validatedParams as DoctorConsultationParams;
	const data = await doctorConsultationService.review(
		id,
		req.auth!.id,
		req.body as DoctorReviewInput,
	);

	res.status(200).json({
		success: true,
		message: "Review dokter berhasil disimpan.",
		data,
	});
};

export const closeDoctorConsultation: RequestHandler = async (req, res) => {
	const { id } = res.locals.validatedParams as DoctorConsultationParams;
	const data = await doctorConsultationService.close(id, req.auth!.id);

	res.status(200).json({
		success: true,
		message: "Konsultasi berhasil ditutup.",
		data,
	});
};
