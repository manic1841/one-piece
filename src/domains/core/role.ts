// Role enum
export const RoleEnum = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  GUEST: 'guest',
};

export type Role = keyof typeof RoleEnum;
