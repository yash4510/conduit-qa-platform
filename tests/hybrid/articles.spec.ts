import { expect } from '@playwright/test';
import { buildArticle } from '../../src/data/factories.ts';
import { test } from '../../src/fixtures/index.ts';

// Hybrid tests set up or verify through the API and drive only the behaviour under test in the browser.
test.describe('Articles across API and UI', { tag: ['@hybrid', '@regression'] }, () => {
  test('article created through the API is shown on its page', async ({
    newSession,
    signInAs,
    articlePage,
  }) => {
    const author = await newSession();
    const created = await author.api.createArticle(buildArticle());
    await signInAs(author);

    await articlePage.goto(created.slug);

    await expect(articlePage.title).toHaveText(created.title);
    await expect(articlePage.body).toContainText(created.body.split('\n')[0]!);
    await expect
      .poll(async () => (await articlePage.tags.allTextContents()).sort())
      .toEqual([...created.tagList].sort());
  });

  test('article published in the UI is stored with the same content', async ({
    newSession,
    signInAs,
    editorPage,
    articlePage,
  }) => {
    const author = await newSession();
    const input = buildArticle();
    await signInAs(author);

    await editorPage.goto();
    await editorPage.fill(input);
    await editorPage.publish();
    const slug = await articlePage.waitForSlug();
    author.api.trackArticle(slug);

    const stored = await author.api.getArticle(slug);
    expect(stored).toMatchObject({
      title: input.title,
      description: input.description,
      body: input.body,
      author: { username: author.profile.username },
    });
    expect([...stored.tagList].sort()).toEqual([...input.tagList].sort());
  });

  test('article edited in the UI is updated in the API', async ({
    newSession,
    signInAs,
    articlePage,
    editorPage,
  }) => {
    const author = await newSession();
    const created = await author.api.createArticle(buildArticle());
    const newTitle = buildArticle().title;
    await signInAs(author);

    await articlePage.goto(created.slug);
    await articlePage.editLink.click();
    // The editor fills the form asynchronously; typing before that finishes gets overwritten.
    await expect(editorPage.titleInput).toHaveValue(created.title);
    await editorPage.replaceTitle(newTitle);
    await editorPage.publish();
    const newSlug = await articlePage.waitForSlug();
    author.api.trackArticle(newSlug);

    expect((await author.api.getArticle(newSlug)).title).toBe(newTitle);
  });
});
