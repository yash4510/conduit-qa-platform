import { expect } from '@playwright/test';
import { buildArticle } from '../../src/data/factories.ts';
import { test } from '../../src/fixtures/index.ts';

test.describe('Favorites and follows across API and UI', { tag: ['@hybrid', '@regression'] }, () => {
  test('favoriting an article in the UI is recorded by the API', async ({
    newSession,
    signInAs,
    profilePage,
  }) => {
    const user = await newSession();
    const article = await user.api.createArticle(buildArticle());
    await signInAs(user);

    await profilePage.goto(user.profile.username);
    await profilePage.favoriteButton(article.title).click();
    await expect(profilePage.favoriteButton(article.title)).toContainText('1');

    expect(await user.api.getArticle(article.slug)).toMatchObject({ favorited: true, favoritesCount: 1 });
  });

  test('removing a favorite in the UI is recorded by the API', async ({
    newSession,
    signInAs,
    profilePage,
  }) => {
    const user = await newSession();
    const article = await user.api.createArticle(buildArticle());
    await user.api.favorite(article.slug);
    await signInAs(user);

    await profilePage.goto(user.profile.username);
    await profilePage.favoriteButton(article.title).click();
    await expect(profilePage.favoriteButton(article.title)).toContainText('0');

    expect(await user.api.getArticle(article.slug)).toMatchObject({ favorited: false, favoritesCount: 0 });
  });

  test('following an author in the UI is recorded by the API', async ({
    newSession,
    signInAs,
    profilePage,
  }) => {
    const reader = await newSession();
    const author = await newSession();
    await signInAs(reader);

    await profilePage.goto(author.profile.username);
    await profilePage.followButton(author.profile.username).click();
    await expect(profilePage.unfollowButton(author.profile.username)).toBeVisible();

    expect((await reader.api.getProfile(author.profile.username)).following).toBe(true);
  });

  test('unfollowing an author in the UI is recorded by the API', async ({
    newSession,
    signInAs,
    profilePage,
  }) => {
    const reader = await newSession();
    const author = await newSession();
    await reader.api.follow(author.profile.username);
    await signInAs(reader);

    await profilePage.goto(author.profile.username);
    await profilePage.unfollowButton(author.profile.username).click();
    await expect(profilePage.followButton(author.profile.username)).toBeVisible();

    expect((await reader.api.getProfile(author.profile.username)).following).toBe(false);
  });

  test("articles by a followed author appear in the reader's feed", async ({
    newSession,
    signInAs,
    homePage,
  }) => {
    const reader = await newSession();
    const author = await newSession();
    await reader.api.follow(author.profile.username);
    const article = await author.api.createArticle(buildArticle());
    await signInAs(reader);

    await homePage.goto();
    await homePage.openYourFeed();

    await expect(homePage.articlePreview(article.title)).toBeVisible();
  });
});
