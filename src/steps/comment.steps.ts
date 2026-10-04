import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { buildComment } from '../data/factories.ts';
import { test } from '../fixtures/index.ts';

const { Given, When, Then } = createBdd(test);

Given('I have commented on that article', async ({ api, scenario }) => {
  scenario.comment = buildComment();
  await api.addComment(scenario.article!.slug, scenario.comment);
});

When('I post a comment', async ({ articlePage, scenario }) => {
  scenario.comment = buildComment();
  await articlePage.postComment(scenario.comment);
});

When('I delete my comment', async ({ articlePage, scenario }) => {
  await articlePage.deleteComment(scenario.comment!);
});

Then('I see my comment under the article', async ({ articlePage, scenario }) => {
  await expect(articlePage.comment(scenario.comment!)).toBeVisible();
});

Then('my comment is no longer shown', async ({ articlePage, scenario }) => {
  await expect(articlePage.comment(scenario.comment!)).toHaveCount(0);
});
