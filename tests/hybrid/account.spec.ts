import { expect } from '@playwright/test';
import { buildUser } from '../../src/data/factories.ts';
import { test } from '../../src/fixtures/index.ts';

test.describe('Account across API and UI', { tag: ['@hybrid', '@regression'] }, () => {
  test('bio saved in the settings page is stored by the API', async ({
    newSession,
    signInAs,
    settingsPage,
  }) => {
    const user = await newSession();
    const bio = 'I write tests for a living';
    await signInAs(user);

    await settingsPage.goto();
    await settingsPage.updateBio(bio);

    await expect.poll(async () => (await user.api.getCurrentUser()).bio).toBe(bio);
  });

  test('account created in the UI can log in through the API', async ({ guest, registerPage, homePage }) => {
    const user = buildUser();

    await registerPage.goto();
    await registerPage.signUp(user);
    await expect(homePage.navbar.userLink(user.username)).toBeVisible();

    const loggedIn = await guest.login(user.email, user.password);
    expect(loggedIn.username).toBe(user.username);
  });
});
