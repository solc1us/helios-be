import type { RequestHandler } from "express";

import { adminService } from "../services/admin.service";
import type {
	AdminAccountListQuery,
	AdminAuditLogListQuery,
	AdminConsultationListQuery,
	AdminIdParams,
	CreateDoctorInput,
	UpdateAccountStatusInput,
	UpdateDoctorInput,
} from "../types/admin.type";

export const listAdminDoctors: RequestHandler = async (_req, res) => {
	const data = await adminService.listDoctors(
		res.locals.validatedQuery as AdminAccountListQuery,
	);
	res.status(200).json({ success: true, message: "Daftar dokter berhasil diambil.", data });
};

export const createAdminDoctor: RequestHandler = async (req, res) => {
	const data = await adminService.createDoctor(
		req.auth!.id,
		req.body as CreateDoctorInput,
	);
	res.status(201).json({ success: true, message: "Data dokter berhasil ditambahkan.", data });
};

export const getAdminDoctor: RequestHandler = async (_req, res) => {
	const { id } = res.locals.validatedParams as AdminIdParams;
	const data = await adminService.getDoctor(id);
	res.status(200).json({ success: true, message: "Detail dokter berhasil diambil.", data });
};

export const updateAdminDoctor: RequestHandler = async (req, res) => {
	const { id } = res.locals.validatedParams as AdminIdParams;
	const data = await adminService.updateDoctor(
		req.auth!.id,
		id,
		req.body as UpdateDoctorInput,
	);
	res.status(200).json({ success: true, message: "Data dokter berhasil diperbarui.", data });
};

export const updateAdminDoctorStatus: RequestHandler = async (req, res) => {
	const { id } = res.locals.validatedParams as AdminIdParams;
	const data = await adminService.updateDoctorStatus(
		req.auth!.id,
		id,
		req.body as UpdateAccountStatusInput,
	);
	res.status(200).json({ success: true, message: "Status dokter berhasil diperbarui.", data });
};

export const listAdminPatients: RequestHandler = async (_req, res) => {
	const data = await adminService.listPatients(
		res.locals.validatedQuery as AdminAccountListQuery,
	);
	res.status(200).json({ success: true, message: "Daftar pasien berhasil diambil.", data });
};

export const getAdminPatient: RequestHandler = async (_req, res) => {
	const { id } = res.locals.validatedParams as AdminIdParams;
	const data = await adminService.getPatient(id);
	res.status(200).json({ success: true, message: "Detail pasien berhasil diambil.", data });
};

export const updateAdminPatientStatus: RequestHandler = async (req, res) => {
	const { id } = res.locals.validatedParams as AdminIdParams;
	const data = await adminService.updatePatientStatus(
		req.auth!.id,
		id,
		req.body as UpdateAccountStatusInput,
	);
	res.status(200).json({ success: true, message: "Status pasien berhasil diperbarui.", data });
};

export const listAdminConsultations: RequestHandler = async (_req, res) => {
	const data = await adminService.listConsultations(
		res.locals.validatedQuery as AdminConsultationListQuery,
	);
	res.status(200).json({ success: true, message: "Daftar konsultasi berhasil diambil.", data });
};

export const getAdminConsultation: RequestHandler = async (req, res) => {
	const { id } = res.locals.validatedParams as AdminIdParams;
	const data = await adminService.getConsultation(id, req.auth!.id);
	res.status(200).json({ success: true, message: "Detail konsultasi berhasil diambil.", data });
};

export const listAdminAuditLogs: RequestHandler = async (_req, res) => {
	const data = await adminService.listAuditLogs(
		res.locals.validatedQuery as AdminAuditLogListQuery,
	);
	res.status(200).json({ success: true, message: "Audit log berhasil diambil.", data });
};
