import { expect } from '@playwright/test';
import { expectUnauthorized } from '../../src/api/assertions.ts';
import { buildArticle } from '../../src/data/factories.ts';
import { test } from '../../src/fixtures/index.ts';

test.describe('Favorites', { tag: ['@api', '@regression'] }, () => {
  test('user can favorite an article', async ({ newSession, guest }) => {
    const author = await newSession();
    const fan = await newSession();
    const article = await author.api.createArticle(buildArticle());

    const favorited = await fan.api.favorite(article.slug);

    expect(favorited).toMatchObject({ favorited: true, favoritesCount: 1 });
    // "favorited" is per viewer: the fan sees true, everyone else sees false but the same count.
    expect((await fan.api.getArticle(article.slug)).favorited).toBe(true);
    expect(await guest.getArticle(article.slug)).toMatchObject({ favorited: false, favoritesCount: 1 });
  });

  test('favoriting twice counts once', async ({ newSession }) => {
    const { api } = await newSession();
    const article = await api.createArticle(buildArticle());
    await api.favorite(article.slug);

    const again = await api.favorite(article.slug);

    expect(again.favoritesCount).toBe(1);
  });

  test('user can remove their favorite', async ({ newSession }) => {
    const { api } = await newSession();
    const article = await api.createArticle(buildArticle());
    await api.favorite(article.slug);

    const removed = await api.unfavorite(article.slug);

    expect(removed).toMatchObject({ favorited: false, favoritesCount: 0 });
  });

  test('removing a favorite that does not exist changes nothing', async ({ newSession }) => {
    const { api } = await newSession();
    const article = await api.createArticle(buildArticle());

    const removed = await api.unfavorite(article.slug);

    expect(removed).toMatchObject({ favorited: false, favoritesCount: 0 });
  });

  test('favorites from different users add up', async ({ newSession }) => {
    const author = await newSession();
    const first = await newSession();
    const second = await newSession();
    const article = await author.api.createArticle(buildArticle());
    await first.api.favorite(article.slug);

    const result = await second.api.favorite(article.slug);

    expect(result.favoritesCount).toBe(2);
  });

  test('guest cannot favorite an article', async ({ newSession, guest }) => {
    const { api } = await newSession();
    const article = await api.createArticle(buildArticle());

    expectUnauthorized(await guest.raw('POST', `/articles/${article.slug}/favorite`));
  });

  test('guest cannot remove a favorite', async ({ newSession, guest }) => {
    const { api } = await newSession();
    const article = await api.createArticle(buildArticle());

    expectUnauthorized(await guest.raw('DELETE', `/articles/${article.slug}/favorite`));
  });

  // Should be 404. Today the raw Prisma error text comes back with status 500.
  test('favoriting an unknown article is not found', async ({ newSession }) => {
    test.fail(true, 'Defect: favorite on unknown article returns 500 and leaks the Prisma error');
    const { api } = await newSession();

    const res = await api.raw('POST', '/articles/no-such-article-slug/favorite');

    expect(res.status).toBe(404);
  });
});
