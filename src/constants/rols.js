import { Role } from '@prisma/client';

export const ROLES = {
    OWNER: Role.OWNER,
    ADMIN: Role.ADMIN,
    EMPLOYEE: Role.EMPLOYEE,
    READ_ONLY: Role.READ_ONLY,
};

export const STAFF_ROLES = [ROLES.OWNER, ROLES.ADMIN, ROLES.EMPLOYEE];
export const ALL_ROLES = Object.values(ROLES);