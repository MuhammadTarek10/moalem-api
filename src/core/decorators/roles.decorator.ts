import { SetMetadata } from '@nestjs/common';
import { UserRoles } from 'src/users/schemas/user-roles.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRoles[]) =>
  SetMetadata<typeof ROLES_KEY, UserRoles[]>(ROLES_KEY, roles);
