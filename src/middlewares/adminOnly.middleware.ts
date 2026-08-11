import { ROLES } from "../constants/roles";
import { requireRole } from "./role.middleware";

export const adminOnly = requireRole(ROLES.ADMIN);
