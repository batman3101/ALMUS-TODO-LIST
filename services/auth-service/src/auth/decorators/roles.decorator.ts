import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@almus/shared-types';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles); 