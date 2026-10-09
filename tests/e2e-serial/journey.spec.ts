// SERIAL ON PURPOSE. Every other suite here is independent and runs in parallel. This file is the one
// exception: it follows a single user through the whole life of an article, so each step needs the result
// of the one before it (the account, the article, its slug) and a browser session that stays signed in.
// If a step fails, the rest are skipped, because they would only fail for the same reason.
import { expect, type BrowserContext, type Page } from '@playwright/test';
import { ConduitApi } from '../../src/api/client.ts';
import { buildArticle, buildComment, buildUser } from '../../src/data/factories.ts';
import { blockNonLocalRequests, test } from '../../src/fixtures/index.ts';
import { ArticleEditorPage } from '../../src/pages/ArticleEditorPage.ts';
import { ArticlePage } from '../../src/pages/ArticlePage.ts';
import { HomePage } from '../../src/pages/HomePage.ts';
import { LoginPage } from '../../src/pages/LoginPage.ts';
import { ProfilePage } from '../../src/pages/ProfilePage.ts';
import { RegisterPage } from '../../src/pages/RegisterPage.ts';
import { SettingsPage } from '../../src/pages/SettingsPage.ts';
import { ApiLogger } from '../../src/utils/logger.ts';

test.describe('A user from sign-up to deleting their article', { tag: ['@serial', '@regression'] }, () => {
  test.describe.configure({ mode: 'serial' });

  // State handed from one step to the next.
  const user = buildUser();
  const article = buildArticle();
  const comment = buildComment();
  const newTitle = buildArticle().title;
  let slug = '';

  // One browser session for the whole journey, so the sign-in carries over between steps.
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    await blockNonLocalRequests(context);
    page = await context.newPage();
  });

  test.afterEach(async ({}, testInfo) => {
    // The shared page is not managed by Playwright, so attach the failure screenshot by hand.
    if (testInfo.status !== testInfo.expectedStatus) {
      await testInfo.attach('screenshot', { body: await page.screenshot(), contentType: 'image/png' });
    }
  });

  test.afterAll(async ({ playwright }) => {
    await context.close();
    // Best effort: if a middle step failed, the article may still exist. The API cannot delete the user.
    if (!slug) return;
    const request = await playwright.request.newContext();
    try {
      const api = new ConduitApi(request, new ApiLogger('serial-cleanup'));
      await api.login(user.email, user.password);
      await api.raw('DELETE', `/articles/${slug}`);
    } catch {
      // Nothing to clean up if the account was never created.
    } finally {
      await request.dispose();
    }
  });

  test('visitor signs up and is signed in', async () => {
    const register = new RegisterPage(page);
    await register.goto();
    await register.signUp(user);

    await expect(new HomePage(page).navbar.userLink(user.username)).toBeVisible();
  });

  test('user publishes an article', async () => {
    const editor = new ArticleEditorPage(page);
    const articlePage = new ArticlePage(page);
    await editor.goto();
    await editor.fill(article);
    await editor.publish();
    slug = await articlePage.waitForSlug();

    await expect(articlePage.title).toHaveText(article.title);
  });

  test('user comments on the article', async () => {
    const articlePage = new ArticlePage(page);
    await articlePage.goto(slug);
    await articlePage.postComment(comment);

    await expect(articlePage.comment(comment)).toBeVisible();
  });

  test('user favourites the article from their profile', async () => {
    const profile = new ProfilePage(page);
    await profile.goto(user.username);
    await profile.favoriteButton(article.title).click();

    await expect(profile.favoriteButton(article.title)).toContainText('1');
  });

  test('user renames the article', async () => {
    const articlePage = new ArticlePage(page);
    const editor = new ArticleEditorPage(page);
    await articlePage.goto(slug);
    await articlePage.editLink.click();
    // The editor fills the form asynchronously; typing before that finishes gets overwritten.
    await expect(editor.titleInput).toHaveValue(article.title);
    await editor.replaceTitle(newTitle);
    await editor.publish();
    slug = await articlePage.waitForSlug();

    await expect(articlePage.title).toHaveText(newTitle);
  });

  test('the comment and the favourite survive the rename', async ({ guest }) => {
    await guest.login(user.email, user.password);

    const stored = await guest.getArticle(slug);
    expect(stored).toMatchObject({ title: newTitle, favorited: true, favoritesCount: 1 });
    expect((await guest.listComments(slug)).map((c) => c.body)).toEqual([comment]);
  });

  test('user deletes the article', async ({ guest }) => {
    const articlePage = new ArticlePage(page);
    await articlePage.goto(slug);
    await articlePage.deleteButton.click();
    await expect(page).toHaveURL('/');

    await expect(guest.getArticle(slug)).rejects.toMatchObject({ status: 404 });
  });

  test('user signs out and signs back in', async () => {
    const settings = new SettingsPage(page);
    const login = new LoginPage(page);
    const home = new HomePage(page);
    await settings.goto();
    await settings.logout();
    await expect(home.navbar.signInLink).toBeVisible();

    await login.goto();
    await login.signIn(user.email, user.password);

    await expect(home.navbar.userLink(user.username)).toBeVisible();
  });
});
