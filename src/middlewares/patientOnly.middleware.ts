import { ROLES } from "../constants/roles";
import { requireRole } from "./role.middleware";

export const patientOnly = requireRole(ROLES.PATIENT);
