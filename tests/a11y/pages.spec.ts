import { AxeBuilder } from '@axe-core/playwright';
import { expect, type Page, type TestInfo } from '@playwright/test';
import { buildArticle } from '../../src/data/factories.ts';
import { test } from '../../src/fixtures/index.ts';

// WCAG 2.0/2.1 level A and AA rules.
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

// Ratchet: the axe rules each page is known to break. Today that is only color-contrast: the navbar links
// are #b3b3b3 on white (2.09:1, WCAG AA needs 4.5:1) and the green links are 3.01:1.
// The test fails when a NEW rule appears (a regression)
// and when a known rule is gone (a fix: remove it here so the baseline stays honest).
const KNOWN: Record<string, string[]> = {
  home: ['color-contrast'],
  'sign in': ['color-contrast'],
  'sign up': ['color-contrast'],
  'new article': ['color-contrast'],
  article: ['color-contrast'],
  settings: ['color-contrast'],
  profile: ['color-contrast'],
};

test.describe('Accessibility', { tag: ['@a11y', '@regression'] }, () => {
  async function scan(page: Page, name: string, testInfo: TestInfo) {
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    await testInfo.attach(`axe-${name}.json`, {
      body: JSON.stringify(
        results.violations.map((v) => ({
          rule: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.length,
        })),
        null,
        2,
      ),
      contentType: 'application/json',
    });
    return [...new Set(results.violations.map((v) => v.id))].sort();
  }

  test('home page', async ({ page, homePage }, testInfo) => {
    await homePage.goto();
    await expect(homePage.globalFeedTab).toBeVisible();
    expect(await scan(page, 'home', testInfo)).toEqual(KNOWN['home']);
  });

  test('sign in page', async ({ page, loginPage }, testInfo) => {
    await loginPage.goto();
    await expect(loginPage.signInButton).toBeVisible();
    expect(await scan(page, 'sign-in', testInfo)).toEqual(KNOWN['sign in']);
  });

  test('sign up page', async ({ page, registerPage }, testInfo) => {
    await registerPage.goto();
    await expect(registerPage.signUpButton).toBeVisible();
    expect(await scan(page, 'sign-up', testInfo)).toEqual(KNOWN['sign up']);
  });

  test('new article page', async ({ page, editorPage, newSession, signInAs }, testInfo) => {
    await signInAs(await newSession());
    await editorPage.goto();
    await expect(editorPage.publishButton).toBeVisible();
    expect(await scan(page, 'new-article', testInfo)).toEqual(KNOWN['new article']);
  });

  test('article page', async ({ page, articlePage, newSession, signInAs }, testInfo) => {
    const author = await newSession();
    const article = await author.api.createArticle(buildArticle());
    await author.api.addComment(article.slug, 'A comment, so the comment list is scanned too');
    await signInAs(author);
    await articlePage.goto(article.slug);
    await expect(articlePage.title).toBeVisible();
    await expect(articlePage.comment('A comment')).toBeVisible();
    expect(await scan(page, 'article', testInfo)).toEqual(KNOWN['article']);
  });

  test('settings page', async ({ page, settingsPage, newSession, signInAs }, testInfo) => {
    await signInAs(await newSession());
    await settingsPage.goto();
    await expect(settingsPage.updateButton).toBeVisible();
    expect(await scan(page, 'settings', testInfo)).toEqual(KNOWN['settings']);
  });

  test('profile page', async ({ page, profilePage, newSession, signInAs }, testInfo) => {
    const user = await newSession();
    await user.api.createArticle(buildArticle());
    await signInAs(user);
    await profilePage.goto(user.profile.username);
    await expect(profilePage.articlePreview('')).toBeVisible();
    expect(await scan(page, 'profile', testInfo)).toEqual(KNOWN['profile']);
  });
});
