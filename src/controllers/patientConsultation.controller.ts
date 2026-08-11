import type { RequestHandler } from "express";

import { consultationService } from "../services/consultation.service";
import type {
	ConsultationDetailParams,
	ConsultationListQuery,
	CreateConsultationInput,
} from "../types/consultation.type";

export const createPatientConsultation: RequestHandler = async (req, res) => {
	const data = await consultationService.createForPatient(
		req.auth!.id,
		req.body as CreateConsultationInput,
	);

	res.status(201).json({
		success: true,
		message: "Konsultasi berhasil dianalisis.",
		data,
	});
};

export const listPatientConsultations: RequestHandler = async (req, res) => {
	const data = await consultationService.listForPatient(
		req.auth!.id,
		res.locals.validatedQuery as ConsultationListQuery,
	);

	res.status(200).json({
		success: true,
		message: "Riwayat konsultasi berhasil diambil.",
		data,
	});
};

export const getPatientConsultationDetail: RequestHandler = async (
	req,
	res,
) => {
	const params = res.locals.validatedParams as ConsultationDetailParams;
	const data = await consultationService.getDetailForPatient(
		params.id,
		req.auth!.id,
	);

	res.status(200).json({
		success: true,
		message: "Detail konsultasi berhasil diambil.",
		data,
	});
};
