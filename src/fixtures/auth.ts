import { readFileSync } from 'node:fs';

// Written once per run by tests/auth.setup.ts and reused by every signed-in test.
export const STORAGE_STATE = '.auth/state.json';
export const AUTH_USER = '.auth/user.json';

export type AuthUser = { username: string; email: string; token: string };

export function readAuthUser(): AuthUser {
  return JSON.parse(readFileSync(AUTH_USER, 'utf-8')) as AuthUser;
}
