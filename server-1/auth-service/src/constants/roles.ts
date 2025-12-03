// ============================================
// src/constants/roles.ts
// ============================================
import { RoleType } from '@prisma/client';

export const ROLES = {
  RIDER: RoleType.RIDER,
  DRIVER: RoleType.DRIVER,
  FLEET_OWNER: RoleType.FLEET_OWNER,
  ADMIN: RoleType.ADMIN,
  SUPER_ADMIN: RoleType.SUPER_ADMIN,
} as const;

export const ROLE_HIERARCHY: Record<RoleType, number> = {
  [RoleType.SUPER_ADMIN]: 5,
  [RoleType.ADMIN]: 4,
  [RoleType.FLEET_OWNER]: 3,
  [RoleType.DRIVER]: 2,
  [RoleType.RIDER]: 1,
};

export const hasHigherRole = (userRole: RoleType, requiredRole: RoleType): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

export const isAdmin = (role: RoleType): boolean => {
  return role === RoleType.ADMIN || role === RoleType.SUPER_ADMIN;
};

export const canManageDrivers = (role: RoleType): boolean => {
  return role === RoleType.FLEET_OWNER || isAdmin(role);
};