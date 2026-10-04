import { expect } from '@playwright/test';
import { expectEmptyBody, expectUnauthorized } from '../../src/api/assertions.ts';
import { buildUser } from '../../src/data/factories.ts';
import { test } from '../../src/fixtures/index.ts';

test.describe('Profiles and follows', { tag: ['@api', '@regression'] }, () => {
  test('guest can view a profile', async ({ newSession, guest }) => {
    const { api, profile } = await newSession();
    await api.updateUser({ bio: 'Tester by trade' });

    const seen = await guest.getProfile(profile.username);

    expect(seen).toMatchObject({ username: profile.username, bio: 'Tester by trade', following: false });
  });

  test('profile never exposes email or token', async ({ newSession, guest }) => {
    const { profile } = await newSession();

    const res = await guest.raw('GET', `/profiles/${profile.username}`);

    expect(res.body).toEqual({ profile: expect.not.objectContaining({ email: expect.anything() }) });
    expect(JSON.stringify(res.body)).not.toContain(profile.token);
  });

  test('unknown profile is not found', async ({ guest }) => {
    // The spec expects an errors object here; the API answers with an empty body.
    expectEmptyBody(await guest.raw('GET', `/profiles/${buildUser().username}`), 404);
  });

  test('user can follow another user', async ({ newSession }) => {
    const reader = await newSession();
    const author = await newSession();

    const followed = await reader.api.follow(author.profile.username);

    expect(followed).toMatchObject({ username: author.profile.username, following: true });
  });

  test('following is visible only to the follower', async ({ newSession, guest }) => {
    const reader = await newSession();
    const other = await newSession();
    const author = await newSession();
    await reader.api.follow(author.profile.username);

    expect((await reader.api.getProfile(author.profile.username)).following).toBe(true);
    expect((await other.api.getProfile(author.profile.username)).following).toBe(false);
    expect((await guest.getProfile(author.profile.username)).following).toBe(false);
  });

  test('following twice keeps the follow', async ({ newSession }) => {
    const reader = await newSession();
    const author = await newSession();
    await reader.api.follow(author.profile.username);

    const again = await reader.api.follow(author.profile.username);

    expect(again.following).toBe(true);
  });

  test('user can unfollow', async ({ newSession }) => {
    const reader = await newSession();
    const author = await newSession();
    await reader.api.follow(author.profile.username);

    const unfollowed = await reader.api.unfollow(author.profile.username);

    expect(unfollowed.following).toBe(false);
    expect((await reader.api.getProfile(author.profile.username)).following).toBe(false);
  });

  test('unfollowing someone who is not followed changes nothing', async ({ newSession }) => {
    const reader = await newSession();
    const author = await newSession();

    const result = await reader.api.unfollow(author.profile.username);

    expect(result.following).toBe(false);
  });

  test('guest cannot follow', async ({ newSession, guest }) => {
    const { profile } = await newSession();

    expectUnauthorized(await guest.raw('POST', `/profiles/${profile.username}/follow`));
  });

  test('guest cannot unfollow', async ({ newSession, guest }) => {
    const { profile } = await newSession();

    expectUnauthorized(await guest.raw('DELETE', `/profiles/${profile.username}/follow`));
  });

  // Should be 404. Today the raw Prisma error text comes back with status 500.
  test('following an unknown user is not found', async ({ newSession }) => {
    test.fail(true, 'Defect: follow on unknown user returns 500 and leaks the Prisma error');
    const { api } = await newSession();

    const res = await api.raw('POST', `/profiles/${buildUser().username}/follow`);

    expect(res.status).toBe(404);
  });
});
