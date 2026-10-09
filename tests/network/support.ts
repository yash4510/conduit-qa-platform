import { articleSchema, type Article } from '../../src/api/schemas.ts';

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
