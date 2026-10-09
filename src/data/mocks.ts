import { articleSchema, commentSchema, type Article, type Comment } from '../api/schemas.ts';

// Replies the mocked routes send. Payloads go through the same Zod schema the API client uses,
// so a mock can never drift into a shape the real API would not return.
export const json = (body: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

export function mockArticle(overrides: Partial<Article> = {}): Article {
  return articleSchema.parse({
    slug: 'mocked-article',
    title: 'A mocked article',
    description: 'Served by the test, not by the API',
    body: 'Body text',
    tagList: ['mocked'],
    createdAt: '2026-01-02T03:04:05.000Z',
    updatedAt: '2026-01-02T03:04:05.000Z',
    favorited: false,
    favoritesCount: 0,
    author: { username: 'mock_author', bio: null, image: null, following: false },
    ...overrides,
  });
}

export const articleList = (articles: Article[]) => json({ articles, articlesCount: articles.length });

export function mockComment(overrides: Partial<Comment> = {}): Comment {
  return commentSchema.parse({
    id: 1,
    createdAt: '2026-01-03T04:05:06.000Z',
    updatedAt: '2026-01-03T04:05:06.000Z',
    body: 'A mocked comment',
    author: { username: 'mock_commenter', bio: null, image: null, following: false },
    ...overrides,
  });
}

export const commentList = (comments: Comment[]) => json({ comments });

// What GET /api/user returns, so a page can believe someone is signed in without a real account.
export const currentUser = (username = 'mock_author') =>
  json({
    user: { email: `${username}@example.test`, username, bio: null, image: null, token: 'mock-token' },
  });
