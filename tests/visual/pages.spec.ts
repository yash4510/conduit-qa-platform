import { expect } from '@playwright/test';
import {
  articleList,
  commentList,
  currentUser,
  json,
  mockArticle,
  mockComment,
} from '../../src/data/mocks.ts';
import { test } from '../../src/fixtures/index.ts';

// Every page is drawn from mocked API data with fixed text and dates, so a screenshot changes only when the
// UI changes. The browser size, time zone and locale are fixed in the project settings.
//
// Baselines are per operating system (the file name ends in -linux or -win32) because fonts render differently.
// Only the Linux ones are committed, because CI runs on Linux. They are made by the "Update visual baselines"
// workflow. A first run on another system writes its own baseline and fails once; run it again.
const FIRST = mockArticle({
  slug: 'first',
  title: 'First mocked article',
  tagList: ['testing', 'playwright'],
});
const SECOND = mockArticle({
  slug: 'second',
  title: 'Second mocked article',
  description: 'Another article with a different description',
  favoritesCount: 3,
  tagList: ['typescript'],
});

test.describe('Visual', { tag: ['@visual', '@regression'] }, () => {
  test('home page', async ({ page, homePage }) => {
    await page.route('**/api/articles?*', (route) => route.fulfill(articleList([FIRST, SECOND])));
    await page.route('**/api/tags', (route) =>
      route.fulfill(json({ tags: ['testing', 'playwright', 'typescript'] })),
    );

    await homePage.goto();
    await expect(homePage.articlePreview('First mocked article')).toBeVisible();

    await expect(page).toHaveScreenshot('home.png', { fullPage: true });
  });

  test('article page with comments', async ({ page, articlePage }) => {
    await page.route('**/api/articles/first', (route) =>
      route.fulfill(
        json({ article: { ...FIRST, body: 'A paragraph of body text.\n\nAnd a second paragraph.' } }),
      ),
    );
    await page.route('**/api/articles/first/comments', (route) =>
      route.fulfill(
        commentList([
          mockComment({ id: 1, body: 'First comment' }),
          mockComment({ id: 2, body: 'Second comment' }),
        ]),
      ),
    );

    await articlePage.goto('first');
    await expect(articlePage.comment('Second comment')).toBeVisible();

    await expect(page).toHaveScreenshot('article.png', { fullPage: true });
  });

  test('sign in page', async ({ page, loginPage }) => {
    await loginPage.goto();
    await expect(loginPage.signInButton).toBeVisible();

    await expect(page).toHaveScreenshot('sign-in.png', { fullPage: true });
  });

  test('sign up page', async ({ page, registerPage }) => {
    await registerPage.goto();
    await expect(registerPage.signUpButton).toBeVisible();

    await expect(page).toHaveScreenshot('sign-up.png', { fullPage: true });
  });

  test('new article page when signed in', async ({ page, editorPage }) => {
    // A made-up token and a mocked /api/user make the app believe someone is signed in, with a fixed name.
    await page.addInitScript(() => window.localStorage.setItem('jwt', 'mock-token'));
    await page.route('**/api/user', (route) => route.fulfill(currentUser()));

    await editorPage.goto();
    await expect(editorPage.publishButton).toBeVisible();

    await expect(page).toHaveScreenshot('new-article.png', { fullPage: true });
  });
});
