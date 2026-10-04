import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { buildArticle } from '../data/factories.ts';
import { test } from '../fixtures/index.ts';

const { Given, When, Then } = createBdd(test);

// These scenarios use a fresh user instead of the shared one: profile and feed pages list only
// that user's articles, so a new user keeps the page contents exact.
Given('I am signed in as a new reader', async ({ newSession, signInAs, scenario }) => {
  scenario.session = await newSession();
  await signInAs(scenario.session);
});

Given(
  'I am signed in as a new author who has published an article',
  async ({ newSession, signInAs, scenario }) => {
    scenario.session = await newSession();
    scenario.article = await scenario.session.api.createArticle(buildArticle());
    await signInAs(scenario.session);
  },
);

Given('another author exists', async ({ newSession, scenario }) => {
  scenario.author = await newSession();
});

Given('I have already favourited that article', async ({ scenario }) => {
  await scenario.session!.api.favorite(scenario.article!.slug);
});

Given('I already follow that author', async ({ scenario }) => {
  await scenario.session!.api.follow(scenario.author!.profile.username);
});

Given('I am on my profile page', async ({ profilePage, scenario }) => {
  await profilePage.goto(scenario.session!.profile.username);
});

Given("I am on that author's profile page", async ({ profilePage, scenario }) => {
  await profilePage.goto(scenario.author!.profile.username);
});

When('I click the favourite button on the article', async ({ profilePage, scenario }) => {
  await profilePage.favoriteButton(scenario.article!.title).click();
});

When('I follow the author', async ({ profilePage, scenario }) => {
  await profilePage.followButton(scenario.author!.profile.username).click();
});

When('I unfollow the author', async ({ profilePage, scenario }) => {
  await profilePage.unfollowButton(scenario.author!.profile.username).click();
});

When('I open my feed on the home page', async ({ homePage }) => {
  await homePage.goto();
  await homePage.openYourFeed();
});

Then('the article shows {int} favourite(s)', async ({ profilePage, scenario }, count: number) => {
  await expect(profilePage.favoriteButton(scenario.article!.title)).toContainText(String(count));
});

Then('I see the unfollow button for the author', async ({ profilePage, scenario }) => {
  await expect(profilePage.unfollowButton(scenario.author!.profile.username)).toBeVisible();
});

Then('I see the follow button for the author', async ({ profilePage, scenario }) => {
  await expect(profilePage.followButton(scenario.author!.profile.username)).toBeVisible();
});

Then('I see that article in the feed', async ({ homePage, scenario }) => {
  await expect(homePage.articlePreview(scenario.article!.title)).toBeVisible();
});

Then('I see that there are no articles', async ({ homePage }) => {
  await expect(homePage.emptyFeedMessage).toBeVisible();
});
