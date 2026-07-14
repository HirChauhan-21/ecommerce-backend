export const ROLES = {
  ADMIN: 'ADMIN',
  SELLER: 'SELLER',
  USER: 'USER',
} as const;

export type RoleType = typeof ROLES[keyof typeof ROLES];
