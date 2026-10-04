import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { buildArticle } from '../data/factories.ts';
import { test } from '../fixtures/index.ts';

const { Given, When, Then } = createBdd(test);

Given('I am on the new article page', async ({ editorPage }) => {
  await editorPage.goto();
});

// Arrange through the API: fast, and keeps the scenario about the behaviour under test.
Given('I have published an article', async ({ api, cleanup, scenario }) => {
  scenario.article = await api.createArticle(buildArticle());
  cleanup.trackArticle(scenario.article.slug);
});

Given("I am on that article's page", async ({ articlePage, scenario }) => {
  await articlePage.goto(scenario.article!.slug);
});

When('I publish a new article', async ({ editorPage, articlePage, cleanup, scenario }) => {
  const article = buildArticle();
  await editorPage.fill(article);
  await editorPage.publish();
  const slug = await articlePage.waitForSlug();
  cleanup.trackArticle(slug);
  scenario.article = { ...article, slug };
});

When('I change the article title', async ({ articlePage, editorPage, cleanup, scenario }) => {
  const newTitle = buildArticle().title;
  await articlePage.editLink.click();
  // The editor fills the form asynchronously; typing before that finishes gets overwritten.
  await expect(editorPage.titleInput).toHaveValue(scenario.article!.title);
  await editorPage.replaceTitle(newTitle);
  await editorPage.publish();
  // The backend regenerates the slug from the new title, so track it for cleanup too.
  cleanup.trackArticle(await articlePage.waitForSlug());
  scenario.article = { ...scenario.article!, title: newTitle };
});

When('I delete the article', async ({ articlePage }) => {
  await articlePage.deleteButton.click();
});

Then('I see the article with its title, body and tags', async ({ articlePage, scenario }) => {
  const article = scenario.article!;
  await expect(articlePage.title).toHaveText(article.title);
  await expect(articlePage.body).toContainText(article.body.split('\n')[0]!);
  // The backend does not keep tag order (the spec does not promise one), so compare sorted.
  await expect
    .poll(async () => (await articlePage.tags.allTextContents()).sort())
    .toEqual([...article.tagList].sort());
});

Then('I see the article with the new title', async ({ articlePage, scenario }) => {
  await expect(articlePage.title).toHaveText(scenario.article!.title);
});

Then('I am taken to the home page', async ({ page }) => {
  await expect(page).toHaveURL('/');
});

Then('the article no longer exists', async ({ api, scenario }) => {
  await expect(api.getArticle(scenario.article!.slug)).rejects.toMatchObject({ status: 404 });
});
