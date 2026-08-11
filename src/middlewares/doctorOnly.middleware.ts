import { ROLES } from "../constants/roles";
import { requireRole } from "./role.middleware";

export const doctorOnly = requireRole(ROLES.DOCTOR);
