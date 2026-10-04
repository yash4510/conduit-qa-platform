import { mkdir, writeFile } from 'node:fs/promises';
import { test as setup } from '@playwright/test';
import { ConduitApi } from '../src/api/client.ts';
import { buildUser } from '../src/data/factories.ts';
import { AUTH_USER, STORAGE_STATE, type AuthUser } from '../src/fixtures/auth.ts';
import { env } from '../src/utils/env.ts';
import { ApiLogger } from '../src/utils/logger.ts';

// Sign up once through the API instead of the UI: faster, and the login form gets its own tests.
setup('create the shared signed-in user', async ({ request }) => {
  const api = new ConduitApi(request, new ApiLogger('auth-setup'));
  const user = await api.register(buildUser());

  // The frontend keeps its session as a JWT in localStorage under the key "jwt".
  const state = {
    cookies: [],
    origins: [{ origin: new URL(env.BASE_URL).origin, localStorage: [{ name: 'jwt', value: user.token }] }],
  };
  const authUser: AuthUser = { username: user.username, email: user.email, token: user.token };

  await mkdir('.auth', { recursive: true });
  await writeFile(STORAGE_STATE, JSON.stringify(state, null, 2));
  await writeFile(AUTH_USER, JSON.stringify(authUser, null, 2));
});
