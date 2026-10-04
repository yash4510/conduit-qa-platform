import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { z } from 'zod';
import { env } from '../utils/env.ts';
import type { ApiLogger } from '../utils/logger.ts';
import {
  articleResponseSchema,
  articlesResponseSchema,
  commentResponseSchema,
  commentsResponseSchema,
  profileResponseSchema,
  tagsResponseSchema,
  userSchema,
  type Article,
  type Comment,
  type Profile,
  type User,
} from './schemas.ts';
import type { NewArticle, NewUser } from '../data/factories.ts';

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
export type ListQuery = {
  tag?: string;
  author?: string;
  favorited?: string;
  limit?: number;
  offset?: number;
};
export type UserUpdate = Partial<{
  email: string;
  username: string;
  bio: string;
  image: string;
  password: string;
}>;
export type RawResponse = { status: number; body: unknown };

// Carries the HTTP status so callers can assert on it, e.g. rejects.toMatchObject({ status: 404 }).
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Thin typed wrapper over the Conduit REST API. Every response is logged and
// validated with a Zod schema, so a contract change fails loudly at the call site.
// A client without a token acts as a guest.
export class ConduitApi {
  private readonly request: APIRequestContext;
  private readonly logger: ApiLogger;
  private token: string | undefined;
  // Articles this client created and has not deleted, removed again by cleanUp().
  private readonly createdSlugs = new Set<string>();

  constructor(request: APIRequestContext, logger: ApiLogger) {
    this.request = request;
    this.logger = logger;
  }

  // --- users

  async register(user: NewUser): Promise<User> {
    const res = await this.send('POST', '/users', { user });
    const { user: created } = await this.parse(res, userSchema, 201);
    this.token = created.token;
    return created;
  }

  // Reuse an existing session, e.g. the user created by the auth setup project.
  authenticate(token: string): void {
    this.token = token;
  }

  async login(email: string, password: string): Promise<User> {
    const res = await this.send('POST', '/users/login', { user: { email, password } });
    const { user } = await this.parse(res, userSchema, 200);
    this.token = user.token;
    return user;
  }

  async getCurrentUser(): Promise<User> {
    const res = await this.send('GET', '/user');
    return (await this.parse(res, userSchema, 200)).user;
  }

  async updateUser(changes: UserUpdate): Promise<User> {
    const res = await this.send('PUT', '/user', { user: changes });
    return (await this.parse(res, userSchema, 200)).user;
  }

  // --- profiles

  async getProfile(username: string): Promise<Profile> {
    const res = await this.send('GET', `/profiles/${username}`);
    return (await this.parse(res, profileResponseSchema, 200)).profile;
  }

  async follow(username: string): Promise<Profile> {
    const res = await this.send('POST', `/profiles/${username}/follow`);
    return (await this.parse(res, profileResponseSchema, 200)).profile;
  }

  async unfollow(username: string): Promise<Profile> {
    const res = await this.send('DELETE', `/profiles/${username}/follow`);
    return (await this.parse(res, profileResponseSchema, 200)).profile;
  }

  // --- articles

  async createArticle(article: NewArticle): Promise<Article> {
    const res = await this.send('POST', '/articles', { article });
    const created = (await this.parse(res, articleResponseSchema, 201)).article;
    this.createdSlugs.add(created.slug);
    return created;
  }

  async getArticle(slug: string): Promise<Article> {
    const res = await this.send('GET', `/articles/${slug}`);
    return (await this.parse(res, articleResponseSchema, 200)).article;
  }

  async listArticles(query: ListQuery = {}): Promise<z.infer<typeof articlesResponseSchema>> {
    const res = await this.send('GET', `/articles${toQueryString(query)}`);
    return this.parse(res, articlesResponseSchema, 200);
  }

  async feed(
    query: Pick<ListQuery, 'limit' | 'offset'> = {},
  ): Promise<z.infer<typeof articlesResponseSchema>> {
    const res = await this.send('GET', `/articles/feed${toQueryString(query)}`);
    return this.parse(res, articlesResponseSchema, 200);
  }

  // For articles created outside this client (e.g. through the UI), so cleanUp() removes them too.
  trackArticle(slug: string): void {
    this.createdSlugs.add(slug);
  }

  // Changing the title changes the slug, so track the new one for cleanup.
  async updateArticle(slug: string, changes: Partial<NewArticle>): Promise<Article> {
    const res = await this.send('PUT', `/articles/${slug}`, { article: changes });
    const updated = (await this.parse(res, articleResponseSchema, 200)).article;
    if (this.createdSlugs.delete(slug)) this.createdSlugs.add(updated.slug);
    return updated;
  }

  async deleteArticle(slug: string): Promise<void> {
    const res = await this.send('DELETE', `/articles/${slug}`);
    await this.expectStatus(res, 204);
    this.createdSlugs.delete(slug);
  }

  async favorite(slug: string): Promise<Article> {
    const res = await this.send('POST', `/articles/${slug}/favorite`);
    return (await this.parse(res, articleResponseSchema, 200)).article;
  }

  async unfavorite(slug: string): Promise<Article> {
    const res = await this.send('DELETE', `/articles/${slug}/favorite`);
    return (await this.parse(res, articleResponseSchema, 200)).article;
  }

  // --- comments

  async addComment(slug: string, body: string): Promise<Comment> {
    const res = await this.send('POST', `/articles/${slug}/comments`, { comment: { body } });
    return (await this.parse(res, commentResponseSchema, 200)).comment;
  }

  async listComments(slug: string): Promise<Comment[]> {
    const res = await this.send('GET', `/articles/${slug}/comments`);
    return (await this.parse(res, commentsResponseSchema, 200)).comments;
  }

  async deleteComment(slug: string, id: number): Promise<void> {
    const res = await this.send('DELETE', `/articles/${slug}/comments/${id}`);
    await this.expectStatus(res, 200);
  }

  // --- tags

  async getTags(): Promise<string[]> {
    const res = await this.send('GET', '/tags');
    return (await this.parse(res, tagsResponseSchema, 200)).tags;
  }

  // --- low level

  // For negative tests: returns whatever the server sent, with no status check and no schema,
  // so the test can assert the status code and the error body itself.
  async raw(method: Method, path: string, data?: unknown): Promise<RawResponse> {
    const res = await this.send(method, path, data);
    const text = await res.text();
    try {
      return { status: res.status(), body: JSON.parse(text) };
    } catch {
      return { status: res.status(), body: text };
    }
  }

  // Test teardown. A 404 is fine: the test may already have deleted the article.
  async cleanUp(): Promise<void> {
    for (const slug of [...this.createdSlugs]) {
      const res = await this.send('DELETE', `/articles/${slug}`);
      if (res.status() !== 204 && res.status() !== 404) await this.expectStatus(res, 204);
    }
    this.createdSlugs.clear();
  }

  private async send(method: Method, path: string, data?: unknown): Promise<APIResponse> {
    const url = `${env.API_URL}${path}`;
    const headers: Record<string, string> = { 'x-correlation-id': this.logger.correlationId };
    if (this.token) headers['Authorization'] = `Token ${this.token}`;

    const started = Date.now();
    // The server closes idle keep-alive connections after about 5 s. A test that pauses on a slow UI step
    // then reuses a dead socket and fails with "socket hang up". maxRetries retries only that ECONNRESET.
    const res = await this.request.fetch(url, { method, headers, data, maxRetries: 2 });
    this.logger.log(method, url, res.status(), Date.now() - started);
    return res;
  }

  private async expectStatus(res: APIResponse, status: number): Promise<void> {
    if (res.status() !== status) {
      throw new ApiError(
        `${res.url()} returned ${res.status()}, expected ${status}: ${await res.text()}`,
        res.status(),
      );
    }
  }

  private async parse<T extends z.ZodType>(res: APIResponse, schema: T, status: number): Promise<z.infer<T>> {
    await this.expectStatus(res, status);
    return schema.parse(await res.json());
  }
}

function toQueryString(query: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}
