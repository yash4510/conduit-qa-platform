import { expect } from '@playwright/test';
import { test } from '../../src/fixtures/index.ts';
import { json, mockArticle } from './support.ts';

test.describe('Article page with mocked responses', { tag: ['@network', '@regression'] }, () => {
  test('markup in an article body is shown as text and never runs', async ({ page, articlePage }) => {
    const body = '<img src=x onerror="window.__pwned = true">';
    await page.route('**/api/articles/mocked-article', (route) =>
      route.fulfill(json({ article: mockArticle({ body }) })),
    );
    await page.route('**/api/articles/mocked-article/comments', (route) =>
      route.fulfill(json({ comments: [] })),
    );

    await articlePage.goto('mocked-article');

    // If the body had been parsed as HTML there would be an <img> and the text would be gone.
    await expect(articlePage.body).toContainText('<img src=x onerror=');
    await expect(articlePage.body.locator('img')).toHaveCount(0);
    expect(await page.evaluate(() => Reflect.has(window, '__pwned'))).toBe(false);
  });

  test('markup in an article title is shown as text', async ({ page, articlePage }) => {
    const title = '<b>bold</b> title';
    await page.route('**/api/articles/mocked-article', (route) =>
      route.fulfill(json({ article: mockArticle({ title }) })),
    );
    await page.route('**/api/articles/mocked-article/comments', (route) =>
      route.fulfill(json({ comments: [] })),
    );

    await articlePage.goto('mocked-article');

    await expect(articlePage.title).toHaveText(title);
    await expect(articlePage.title.locator('b')).toHaveCount(0);
  });

  // A missing article leaves a blank page below the navbar, with an uncaught error in the console.
  test('article page tells the user when the article is not found', async ({ page, articlePage }) => {
    test.fail(true, 'Defect: a 404 for the article leaves a blank page');
    await page.route('**/api/articles/missing-article', (route) =>
      route.fulfill(json({ errors: { article: ['not found'] } }, 404)),
    );
    await page.route('**/api/articles/missing-article/comments', (route) =>
      route.fulfill(json({ comments: [] })),
    );

    await articlePage.goto('missing-article');

    await expect(page.getByText(/not found|could not|error/i)).toBeVisible();
  });
});
