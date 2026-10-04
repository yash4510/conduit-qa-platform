import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { z } from 'zod';
import { env } from '../utils/env.ts';
import type { ApiLogger } from '../utils/logger.ts';
import {
  articleResponseSchema,
  commentResponseSchema,
  profileResponseSchema,
  userSchema,
  type Article,
  type Comment,
  type User,
} from './schemas.ts';
import type { NewArticle, NewUser } from '../data/factories.ts';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

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
export class ConduitApi {
  private readonly request: APIRequestContext;
  private readonly logger: ApiLogger;
  private token: string | undefined;

  constructor(request: APIRequestContext, logger: ApiLogger) {
    this.request = request;
    this.logger = logger;
  }

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

  async createArticle(article: NewArticle): Promise<Article> {
    const res = await this.send('POST', '/articles', { article });
    return (await this.parse(res, articleResponseSchema, 201)).article;
  }

  async getArticle(slug: string): Promise<Article> {
    const res = await this.send('GET', `/articles/${slug}`);
    return (await this.parse(res, articleResponseSchema, 200)).article;
  }

  async deleteArticle(slug: string): Promise<void> {
    const res = await this.send('DELETE', `/articles/${slug}`);
    await this.expectStatus(res, 204);
  }

  async addComment(slug: string, body: string): Promise<Comment> {
    const res = await this.send('POST', `/articles/${slug}/comments`, { comment: { body } });
    return (await this.parse(res, commentResponseSchema, 200)).comment;
  }

  async favorite(slug: string): Promise<Article> {
    const res = await this.send('POST', `/articles/${slug}/favorite`);
    return (await this.parse(res, articleResponseSchema, 200)).article;
  }

  async follow(username: string): Promise<void> {
    const res = await this.send('POST', `/profiles/${username}/follow`);
    await this.parse(res, profileResponseSchema, 200);
  }

  private async send(method: Method, path: string, data?: unknown): Promise<APIResponse> {
    const url = `${env.API_URL}${path}`;
    const headers: Record<string, string> = { 'x-correlation-id': this.logger.correlationId };
    if (this.token) headers['Authorization'] = `Token ${this.token}`;

    const started = Date.now();
    const res = await this.request.fetch(url, { method, headers, data });
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
