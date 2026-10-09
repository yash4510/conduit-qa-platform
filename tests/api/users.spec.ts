import { expect } from '@playwright/test';
import { expectErrors, expectUnauthorized } from '../../src/api/assertions.ts';
import { buildUser } from '../../src/data/factories.ts';
import { test } from '../../src/fixtures/index.ts';

test.describe('Users: registration', { tag: ['@api', '@regression'] }, () => {
  test('visitor can register and gets a working token', { tag: '@smoke' }, async ({ guest }) => {
    const user = buildUser();

    const created = await guest.register(user);

    expect(created).toMatchObject({ username: user.username, email: user.email, bio: null });
    expect(created.token).not.toBe('');
    expect((await guest.getCurrentUser()).username).toBe(user.username);
  });

  const missingField = [
    { field: 'username', message: "can't be blank" },
    { field: 'email', message: "can't be blank" },
    { field: 'password', message: "can't be blank" },
  ] as const;

  for (const { field, message } of missingField) {
    test(`registration without ${field} is rejected`, async ({ guest }) => {
      const incomplete = Object.fromEntries(Object.entries(buildUser()).filter(([key]) => key !== field));

      const res = await guest.raw('POST', '/users', { user: incomplete });

      expectErrors(res, 422, { [field]: [message] });
    });
  }

  test('registration with a username that is taken is rejected', async ({ newSession, guest }) => {
    const existing = await newSession();

    const res = await guest.raw('POST', '/users', {
      user: { ...buildUser(), username: existing.user.username },
    });

    expectErrors(res, 422, { username: ['has already been taken'] });
  });

  test('registration with an email that is taken is rejected', async ({ newSession, guest }) => {
    const existing = await newSession();

    const res = await guest.raw('POST', '/users', { user: { ...buildUser(), email: existing.user.email } });

    expectErrors(res, 422, { email: ['has already been taken'] });
  });

  test('registration response never contains the password', async ({ guest }) => {
    const user = buildUser();

    const res = await guest.raw('POST', '/users', { user });

    expect(res.status).toBe(201);
    expect(JSON.stringify(res.body)).not.toContain(user.password);
  });

  // The API should answer 422 for a malformed email; today it returns 201 and stores it.
  test('registration with a malformed email is rejected', async ({ guest }) => {
    test.fail(true, 'Defect: any string is accepted as an email');

    // Unique per run: a stored bad email would otherwise make the next run fail with "already taken".
    const res = await guest.raw('POST', '/users', {
      user: { ...buildUser(), email: `no-at-sign-${buildUser().username}` },
    });

    expect(res.status).toBe(422);
  });
});

test.describe('Users: login', { tag: ['@api', '@regression'] }, () => {
  test('registered user can log in', { tag: '@smoke' }, async ({ newSession, guest }) => {
    const { user } = await newSession();

    const loggedIn = await guest.login(user.email, user.password);

    expect(loggedIn.username).toBe(user.username);
    expect(loggedIn.token).not.toBe('');
  });

  // Unusual: bad credentials answer 403 (RealWorld implementations usually use 401 or 422).
  // The frontend handles this status, so the test pins the current contract.
  test('login with a wrong password is rejected', async ({ newSession, guest }) => {
    const { user } = await newSession();

    const res = await guest.raw('POST', '/users/login', {
      user: { email: user.email, password: 'wrong-password' },
    });

    expectErrors(res, 403, { 'email or password': ['is invalid'] });
  });

  test('login does not reveal whether an email is registered', async ({ newSession, guest }) => {
    const { user } = await newSession();

    const wrongPassword = await guest.raw('POST', '/users/login', {
      user: { email: user.email, password: 'wrong-password' },
    });
    const unknownEmail = await guest.raw('POST', '/users/login', {
      user: { email: buildUser().email, password: user.password },
    });

    expect(unknownEmail).toEqual(wrongPassword);
  });

  test('login without an email is rejected', async ({ guest }) => {
    const res = await guest.raw('POST', '/users/login', { user: { password: 'whatever' } });

    expectErrors(res, 422, { email: ["can't be blank"] });
  });

  test('login without a password is rejected', async ({ newSession, guest }) => {
    const { user } = await newSession();

    const res = await guest.raw('POST', '/users/login', { user: { email: user.email } });

    expectErrors(res, 422, { password: ["can't be blank"] });
  });
});

test.describe('Users: current user', { tag: ['@api', '@regression'] }, () => {
  test('signed-in user can read their own account', async ({ newSession }) => {
    const { api, user } = await newSession();

    const me = await api.getCurrentUser();

    expect(me).toMatchObject({ username: user.username, email: user.email });
  });

  test('current user without a token is rejected', async ({ guest }) => {
    expectUnauthorized(await guest.raw('GET', '/user'));
  });

  test('current user with an invalid token is rejected', async ({ guest }) => {
    guest.authenticate('not-a-real-token');

    expectUnauthorized(await guest.raw('GET', '/user'));
  });

  test('user can update their bio and image', async ({ newSession }) => {
    const { api } = await newSession();

    const updated = await api.updateUser({
      bio: 'Writes about testing',
      image: 'https://example.test/me.png',
    });

    expect(updated).toMatchObject({ bio: 'Writes about testing', image: 'https://example.test/me.png' });
    expect(await api.getCurrentUser()).toMatchObject({ bio: 'Writes about testing' });
  });

  test('updating the account without a token is rejected', async ({ guest }) => {
    expectUnauthorized(await guest.raw('PUT', '/user', { user: { bio: 'x' } }));
  });

  // Should be 422 with `email has already been taken`. Today the raw database error is returned
  // with status 500, which also leaks internals.
  test('changing the email to one that is taken is rejected', async ({ newSession }) => {
    test.fail(true, 'Defect: duplicate email on update returns 500 and leaks the Prisma error');
    const first = await newSession();
    const second = await newSession();

    const res = await second.api.raw('PUT', '/user', { user: { email: first.user.email } });

    expectErrors(res, 422, { email: ['has already been taken'] });
  });
});
