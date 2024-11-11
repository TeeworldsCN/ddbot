import { Request } from 'jsr:@oak/oak/request';
import type { Token, User } from '../routes/user.ts';

const kv = await Deno.openKv();

export type PERMISSIONS =
  | 'ADMIN' // This is the super admin permission, it overrides all other permissions
  | 'HANDLE_REPORTS'; // Can handle reports

export const Authenticate = async (user: Request, permission: PERMISSIONS | null = null) => {
  const authorization = user.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return false;
  }

  const token = await kv.get<Token>(['token', authorization.slice(7)]);
  if (!token.value) {
    return null;
  }

  if (token.value.permissions.includes('ADMIN')) {
    return token.value;
  } else if (!permission || token.value.permissions.includes(permission)) {
    return token.value;
  }
  return false;
};
