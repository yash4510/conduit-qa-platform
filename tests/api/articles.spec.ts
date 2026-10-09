import { expect } from '@playwright/test';
import {
  expectEmptyBody,
  expectErrors,
  expectMessage,
  expectUnauthorized,
} from '../../src/api/assertions.ts';
import { buildArticle } from '../../src/data/factories.ts';
import { test } from '../../src/fixtures/index.ts';

// The backend does not keep tag order and the spec does not promise one, so compare sorted.
const sorted = (tags: string[]): string[] => [...tags].sort();

test.describe('Articles: create and read', { tag: ['@api', '@regression'] }, () => {
  test('author can create an article and read it back', { tag: '@smoke' }, async ({ newSession, guest }) => {
    const { api, profile } = await newSession();
    const input = buildArticle();

    const created = await api.createArticle(input);

    expect(created).toMatchObject({
      title: input.title,
      description: input.description,
      body: input.body,
      favorited: false,
      favoritesCount: 0,
      author: { username: profile.username, following: false },
    });
    expect(sorted(created.tagList)).toEqual(sorted(input.tagList));
    expect(Number.isNaN(Date.parse(created.createdAt))).toBe(false);
    // Anyone can read an article by its slug, signed in or not.
    expect((await guest.getArticle(created.slug)).title).toBe(input.title);
  });

  test('guest cannot create an article', { tag: '@smoke' }, async ({ guest }) => {
    expectUnauthorized(await guest.raw('POST', '/articles', { article: buildArticle() }));
  });

  test('article without tags has an empty tag list', async ({ newSession }) => {
    const { api } = await newSession();

    const created = await api.createArticle({ ...buildArticle(), tagList: [] });

    expect(created.tagList).toEqual([]);
  });

  for (const field of ['title', 'description', 'body'] as const) {
    test(`article without ${field} is rejected`, async ({ newSession }) => {
      const { api } = await newSession();
      const incomplete = Object.fromEntries(Object.entries(buildArticle()).filter(([key]) => key !== field));

      const res = await api.raw('POST', '/articles', { article: incomplete });

      expectErrors(res, 422, { [field]: ["can't be blank"] });
    });
  }

  test('article with a title that already exists is rejected', async ({ newSession }) => {
    const { api } = await newSession();
    const input = buildArticle();
    await api.createArticle(input);

    const res = await api.raw('POST', '/articles', { article: input });

    expectErrors(res, 422, { title: ['must be unique'] });
  });

  // Should be 422 like the other validation failures. Today the server throws, returns 500
  // and sends the JavaScript error text back to the client.
  test('request without an article object is rejected', async ({ newSession }) => {
    test.fail(true, 'Defect: missing article object returns 500 and leaks an internal error message');
    const { api } = await newSession();

    const res = await api.raw('POST', '/articles', {});

    expect(res.status).toBe(422);
  });

  test('unknown article slug is not found', async ({ guest }) => {
    const res = await guest.raw('GET', '/articles/no-such-article-slug');

    expectErrors(res, 404, { article: ['not found'] });
  });
});

test.describe('Articles: update', { tag: ['@api', '@regression'] }, () => {
  test('author can change the body and keep the title', async ({ newSession }) => {
    const { api } = await newSession();
    const created = await api.createArticle(buildArticle());

    // tagList is sent back too: see the partial-update defect below.
    const updated = await api.updateArticle(created.slug, { body: 'A new body', tagList: created.tagList });

    expect(updated).toMatchObject({ slug: created.slug, title: created.title, body: 'A new body' });
    expect((await api.getArticle(created.slug)).body).toBe('A new body');
  });

  test('changing the title also changes the slug', async ({ newSession }) => {
    const { api } = await newSession();
    const created = await api.createArticle(buildArticle());
    const newTitle = buildArticle().title;

    const updated = await api.updateArticle(created.slug, { title: newTitle });

    expect(updated.title).toBe(newTitle);
    expect(updated.slug).not.toBe(created.slug);
    expect((await api.getArticle(updated.slug)).title).toBe(newTitle);
    expectErrors(await api.raw('GET', `/articles/${created.slug}`), 404, { article: ['not found'] });
  });

  // A PUT that only changes the body should leave the tags alone. Today it wipes them.
  test('updating only the body keeps the tags', async ({ newSession }) => {
    test.fail(true, 'Defect: a partial update removes all tags');
    const { api } = await newSession();
    const created = await api.createArticle(buildArticle());

    const updated = await api.updateArticle(created.slug, { body: 'Only the body changes' });

    expect(sorted(updated.tagList)).toEqual(sorted(created.tagList));
  });

  test("another user cannot edit someone else's article", async ({ newSession }) => {
    const author = await newSession();
    const intruder = await newSession();
    const created = await author.api.createArticle(buildArticle());

    const res = await intruder.api.raw('PUT', `/articles/${created.slug}`, { article: { body: 'hijacked' } });

    expectMessage(res, 403, 'You are not authorized to update this article');
    expect((await author.api.getArticle(created.slug)).body).toBe(created.body);
  });

  test('guest cannot edit an article', async ({ newSession, guest }) => {
    const { api } = await newSession();
    const created = await api.createArticle(buildArticle());

    expectUnauthorized(await guest.raw('PUT', `/articles/${created.slug}`, { article: { body: 'x' } }));
  });

  test('editing an unknown article is not found', async ({ newSession }) => {
    const { api } = await newSession();

    // The spec expects an errors object here; the API answers with an empty body.
    expectEmptyBody(await api.raw('PUT', '/articles/no-such-article-slug', { article: { body: 'x' } }), 404);
  });
});

test.describe('Articles: delete', { tag: ['@api', '@regression'] }, () => {
  test('author can delete their article', async ({ newSession, guest }) => {
    const { api } = await newSession();
    const created = await api.createArticle(buildArticle());

    await api.deleteArticle(created.slug);

    expectErrors(await guest.raw('GET', `/articles/${created.slug}`), 404, { article: ['not found'] });
  });

  test("another user cannot delete someone else's article", async ({ newSession }) => {
    const author = await newSession();
    const intruder = await newSession();
    const created = await author.api.createArticle(buildArticle());

    const res = await intruder.api.raw('DELETE', `/articles/${created.slug}`);

    expectMessage(res, 403, 'You are not authorized to delete this article');
    expect((await author.api.getArticle(created.slug)).slug).toBe(created.slug);
  });

  test('guest cannot delete an article', async ({ newSession, guest }) => {
    const { api } = await newSession();
    const created = await api.createArticle(buildArticle());

    expectUnauthorized(await guest.raw('DELETE', `/articles/${created.slug}`));
  });

  test('deleting an article twice is not found the second time', async ({ newSession }) => {
    const { api } = await newSession();
    const created = await api.createArticle(buildArticle());
    await api.deleteArticle(created.slug);

    expectEmptyBody(await api.raw('DELETE', `/articles/${created.slug}`), 404);
  });
});

test.describe('Articles: lists and feed', { tag: ['@api', '@regression'] }, () => {
  test('articles by an author are listed newest first', async ({ newSession }) => {
    const { api, profile } = await newSession();
    const older = await api.createArticle(buildArticle());
    const newer = await api.createArticle(buildArticle());

    const list = await api.listArticles({ author: profile.username });

    expect(list.articles.map((a) => a.slug)).toEqual([newer.slug, older.slug]);
    expect(list.articlesCount).toBe(2);
  });

  test('limit and offset page through the list', async ({ newSession }) => {
    const { api, profile } = await newSession();
    const first = await api.createArticle(buildArticle());
    const second = await api.createArticle(buildArticle());
    await api.createArticle(buildArticle());

    const page1 = await api.listArticles({ author: profile.username, limit: 1 });
    const page2 = await api.listArticles({ author: profile.username, limit: 1, offset: 1 });
    const rest = await api.listArticles({ author: profile.username, offset: 2 });

    expect(page1.articles).toHaveLength(1);
    expect(page2.articles.map((a) => a.slug)).toEqual([second.slug]);
    expect(rest.articles.map((a) => a.slug)).toEqual([first.slug]);
    expect(page1.articlesCount).toBe(3);
  });

  test('articles can be filtered by tag', async ({ newSession }) => {
    const { api } = await newSession();
    const tag = `tag${Date.now()}`;
    const tagged = await api.createArticle({ ...buildArticle(), tagList: [tag] });
    await api.createArticle(buildArticle());

    const list = await api.listArticles({ tag });

    expect(list.articles.map((a) => a.slug)).toEqual([tagged.slug]);
  });

  test('articles can be filtered by who favorited them', async ({ newSession }) => {
    const { api, profile } = await newSession();
    const liked = await api.createArticle(buildArticle());
    await api.createArticle(buildArticle());
    await api.favorite(liked.slug);

    const list = await api.listArticles({ favorited: profile.username });

    expect(list.articles.map((a) => a.slug)).toEqual([liked.slug]);
  });

  test('feed without a token is rejected', async ({ guest }) => {
    expectUnauthorized(await guest.raw('GET', '/articles/feed'));
  });

  test('feed is empty for a user who follows nobody', async ({ newSession }) => {
    const { api } = await newSession();

    expect(await api.feed()).toEqual({ articles: [], articlesCount: 0 });
  });

  test("feed shows articles by followed authors and nobody else's", async ({ newSession }) => {
    const reader = await newSession();
    const followed = await newSession();
    const stranger = await newSession();
    const fromFollowed = await followed.api.createArticle(buildArticle());
    await stranger.api.createArticle(buildArticle());
    await reader.api.follow(followed.profile.username);

    const feed = await reader.api.feed();

    expect(feed.articles.map((a) => a.slug)).toEqual([fromFollowed.slug]);
  });

  // The global list only includes articles by users flagged `demo` plus the viewer's own,
  // so an ordinary user's articles are invisible to everyone else. Defect, not spec behaviour.
  test("global list shows other users' articles", async ({ newSession }) => {
    test.fail(true, 'Defect: global list hides articles by non-demo authors from other users');
    const author = await newSession();
    const viewer = await newSession();
    const created = await author.api.createArticle(buildArticle());

    const list = await viewer.api.listArticles({ author: author.profile.username });

    expect(list.articles.map((a) => a.slug)).toEqual([created.slug]);
  });
});
