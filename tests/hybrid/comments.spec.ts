import { expect } from '@playwright/test';
import { buildArticle, buildComment } from '../../src/data/factories.ts';
import { test } from '../../src/fixtures/index.ts';

test.describe('Comments across API and UI', { tag: ['@hybrid', '@regression'] }, () => {
  test('comment posted in the UI is stored by the API', async ({ newSession, signInAs, articlePage }) => {
    const user = await newSession();
    const article = await user.api.createArticle(buildArticle());
    const text = buildComment();
    await signInAs(user);

    await articlePage.goto(article.slug);
    await articlePage.postComment(text);
    await expect(articlePage.comment(text)).toBeVisible();

    const stored = await user.api.listComments(article.slug);
    expect(stored.map((c) => c.body)).toEqual([text]);
  });

  test('comment added through the API is shown on the article page', async ({
    newSession,
    signInAs,
    articlePage,
  }) => {
    const user = await newSession();
    const article = await user.api.createArticle(buildArticle());
    const text = buildComment();
    await user.api.addComment(article.slug, text);
    await signInAs(user);

    await articlePage.goto(article.slug);

    await expect(articlePage.comment(text)).toBeVisible();
  });

  test('comment deleted in the UI is removed from the API', async ({ newSession, signInAs, articlePage }) => {
    const user = await newSession();
    const article = await user.api.createArticle(buildArticle());
    const text = buildComment();
    await user.api.addComment(article.slug, text);
    await signInAs(user);

    await articlePage.goto(article.slug);
    await articlePage.deleteComment(text);
    await expect(articlePage.comment(text)).toHaveCount(0);

    expect(await user.api.listComments(article.slug)).toEqual([]);
  });
});
