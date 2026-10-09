import { expect } from '@playwright/test';
import { expectEmptyBody, expectErrors, expectUnauthorized } from '../../src/api/assertions.ts';
import { buildArticle, buildComment } from '../../src/data/factories.ts';
import { test } from '../../src/fixtures/index.ts';

test.describe('Comments', { tag: ['@api', '@regression'] }, () => {
  test("user can comment on another author's article", async ({ newSession }) => {
    const author = await newSession();
    const commenter = await newSession();
    const article = await author.api.createArticle(buildArticle());
    const text = buildComment();

    const comment = await commenter.api.addComment(article.slug, text);

    expect(comment).toMatchObject({ body: text, author: { username: commenter.profile.username } });
    expect((await commenter.api.listComments(article.slug)).map((c) => c.id)).toEqual([comment.id]);
  });

  // The comment list applies the same "demo author or the viewer's own" filter as the article list,
  // so a regular user's comment is visible only to the person who wrote it.
  test("article author can read other users' comments", async ({ newSession }) => {
    test.fail(true, 'Defect: comments by non-demo users are hidden from everyone but their author');
    const author = await newSession();
    const commenter = await newSession();
    const article = await author.api.createArticle(buildArticle());
    const comment = await commenter.api.addComment(article.slug, buildComment());

    const comments = await author.api.listComments(article.slug);

    expect(comments.map((c) => c.id)).toEqual([comment.id]);
  });

  test('guest can read the comments on an article', async ({ newSession, guest }) => {
    test.fail(true, 'Defect: comments by non-demo users are hidden from everyone but their author');
    const { api } = await newSession();
    const article = await api.createArticle(buildArticle());
    const comment = await api.addComment(article.slug, buildComment());

    const comments = await guest.listComments(article.slug);

    expect(comments.map((c) => c.id)).toEqual([comment.id]);
  });

  test('article with no comments returns an empty list', async ({ newSession }) => {
    const { api } = await newSession();
    const article = await api.createArticle(buildArticle());

    expect(await api.listComments(article.slug)).toEqual([]);
  });

  test('guest cannot comment', async ({ newSession, guest }) => {
    const { api } = await newSession();
    const article = await api.createArticle(buildArticle());

    expectUnauthorized(
      await guest.raw('POST', `/articles/${article.slug}/comments`, { comment: { body: 'hi' } }),
    );
  });

  test('comment with an empty body is rejected', async ({ newSession }) => {
    const { api } = await newSession();
    const article = await api.createArticle(buildArticle());

    const res = await api.raw('POST', `/articles/${article.slug}/comments`, { comment: { body: '' } });

    expectErrors(res, 422, { body: ["can't be blank"] });
  });

  test('comment without a body field is rejected', async ({ newSession }) => {
    const { api } = await newSession();
    const article = await api.createArticle(buildArticle());

    const res = await api.raw('POST', `/articles/${article.slug}/comments`, { comment: {} });

    expectErrors(res, 422, { body: ["can't be blank"] });
  });

  // Should be 404. Today the raw Prisma validation text comes back with status 500.
  test('commenting on an unknown article is not found', async ({ newSession }) => {
    test.fail(true, 'Defect: comment on unknown article returns 500 and leaks the Prisma error');
    const { api } = await newSession();

    const res = await api.raw('POST', '/articles/no-such-article-slug/comments', { comment: { body: 'hi' } });

    expect(res.status).toBe(404);
  });

  // Should be 404. Today it returns 200 with an empty object, which is not even a valid comment list.
  test('listing comments of an unknown article is not found', async ({ guest }) => {
    test.fail(true, 'Defect: unknown article returns 200 with {} instead of 404');

    const res = await guest.raw('GET', '/articles/no-such-article-slug/comments');

    expect(res.status).toBe(404);
  });

  test('author of a comment can delete it', async ({ newSession }) => {
    const { api } = await newSession();
    const article = await api.createArticle(buildArticle());
    const comment = await api.addComment(article.slug, buildComment());

    await api.deleteComment(article.slug, comment.id);

    expect(await api.listComments(article.slug)).toEqual([]);
  });

  // The spec says 403 for deleting someone else's comment; this API says 404, as if it did not exist.
  test("another user cannot delete someone else's comment", async ({ newSession }) => {
    const author = await newSession();
    const intruder = await newSession();
    const article = await author.api.createArticle(buildArticle());
    const comment = await author.api.addComment(article.slug, buildComment());

    const res = await intruder.api.raw('DELETE', `/articles/${article.slug}/comments/${comment.id}`);

    expectEmptyBody(res, 404);
    expect(await author.api.listComments(article.slug)).toHaveLength(1);
  });

  test('guest cannot delete a comment', async ({ newSession, guest }) => {
    const { api } = await newSession();
    const article = await api.createArticle(buildArticle());
    const comment = await api.addComment(article.slug, buildComment());

    expectUnauthorized(await guest.raw('DELETE', `/articles/${article.slug}/comments/${comment.id}`));
  });

  test('deleting a comment that does not exist is not found', async ({ newSession }) => {
    const { api } = await newSession();
    const article = await api.createArticle(buildArticle());

    expectEmptyBody(await api.raw('DELETE', `/articles/${article.slug}/comments/99999999`), 404);
  });

  test('deleting a comment twice is not found the second time', async ({ newSession }) => {
    const { api } = await newSession();
    const article = await api.createArticle(buildArticle());
    const comment = await api.addComment(article.slug, buildComment());
    await api.deleteComment(article.slug, comment.id);

    expectEmptyBody(await api.raw('DELETE', `/articles/${article.slug}/comments/${comment.id}`), 404);
  });
});
