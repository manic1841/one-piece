// Role enum
export const RoleEnum = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  GUEST: 'guest',
} as const;

export type Role = (typeof RoleEnum)[keyof typeof RoleEnum];
