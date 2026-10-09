import { expect } from '@playwright/test';
import { test } from '../../src/fixtures/index.ts';
import { articleList, json, mockArticle } from './support.ts';

// The home page loads articles and tags with two requests. These tests answer them from the test,
// so they cover empty, slow, odd and failing responses that are hard to produce with the real API.
const ARTICLES = '**/api/articles?*';
const TAGS = '**/api/tags';

test.describe('Home page with mocked responses', { tag: ['@network', '@regression'] }, () => {
  test('empty article list shows the empty message', async ({ page, homePage }) => {
    await page.route(ARTICLES, (route) => route.fulfill(articleList([])));

    await homePage.goto();

    await expect(homePage.emptyFeedMessage).toBeVisible();
  });

  test('loading message is shown until the articles arrive', async ({ page, homePage }) => {
    // The route holds the reply until the test releases it, so no timers are involved.
    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));
    await page.route(ARTICLES, async (route) => {
      await released;
      await route.fulfill(articleList([mockArticle()]));
    });

    await homePage.goto();
    await expect(homePage.loadingMessage).toBeVisible();
    release();

    await expect(homePage.articlePreview('A mocked article')).toBeVisible();
    await expect(homePage.loadingMessage).toBeHidden();
  });

  test('article with a very long title and many tags is shown in full', async ({ page, homePage }) => {
    const title = `Long title ${'word '.repeat(40)}end`.trim();
    const tags = Array.from({ length: 12 }, (_, i) => `tag${i}`);
    await page.route(ARTICLES, (route) =>
      route.fulfill(articleList([mockArticle({ title, tagList: tags })])),
    );

    await homePage.goto();

    const card = homePage.articlePreview(title);
    await expect(card).toBeVisible();
    await expect(card.locator('.tag-list li')).toHaveCount(12);
  });

  // The home page waits for both requests, so a failure of either one leaves it on "Loading..." with
  // an uncaught error in the console and no message for the user. It should show an error or an empty page.
  const failures = [
    { name: 'the articles request returns 500', url: ARTICLES, reply: () => json({ message: 'boom' }, 500) },
    { name: 'the tags request returns 500', url: TAGS, reply: () => json({ message: 'boom' }, 500) },
  ];
  for (const { name, url, reply } of failures) {
    test(`home page stops loading when ${name}`, async ({ page, homePage }) => {
      test.fail(true, 'Defect: a failed request leaves the page on "Loading..." forever');
      await page.route(url, (route) => route.fulfill(reply()));

      await homePage.goto();

      await expect(homePage.loadingMessage).toBeHidden();
    });
  }

  test('home page stops loading when the connection to the API fails', async ({ page, homePage }) => {
    test.fail(true, 'Defect: a network error leaves the page on "Loading..." forever');
    await page.route(ARTICLES, (route) => route.abort('failed'));

    await homePage.goto();

    await expect(homePage.loadingMessage).toBeHidden();
  });

  test('signed-in user with an expired token is shown the signed-out navbar', async ({
    page,
    homePage,
    newSession,
    signInAs,
  }) => {
    await signInAs(await newSession());
    await page.route('**/api/user', (route) =>
      route.fulfill(json({ status: 'error', message: 'missing authorization credentials' }, 401)),
    );

    await homePage.goto();

    await expect(homePage.navbar.signInLink).toBeVisible();
  });
});
