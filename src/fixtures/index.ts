import { randomUUID } from 'node:crypto';
import { test as base } from 'playwright-bdd';
import { ApiError, ConduitApi } from '../api/client.ts';
import type { Article } from '../api/schemas.ts';
import type { NewUser } from '../data/factories.ts';
import { ArticleEditorPage } from '../pages/ArticleEditorPage.ts';
import { ArticlePage } from '../pages/ArticlePage.ts';
import { HomePage } from '../pages/HomePage.ts';
import { LoginPage } from '../pages/LoginPage.ts';
import { RegisterPage } from '../pages/RegisterPage.ts';
import { ApiLogger } from '../utils/logger.ts';
import { readAuthUser, type AuthUser } from './auth.ts';

// Per-scenario state shared between steps (playwright-bdd recommends fixtures over a global World).
type ScenarioState = {
  user?: NewUser;
  article?: Pick<Article, 'slug' | 'title' | 'body' | 'tagList'>;
  comment?: string;
};

type Fixtures = {
  logger: ApiLogger;
  authUser: AuthUser;
  api: ConduitApi;
  cleanup: { trackArticle(slug: string): void };
  scenario: ScenarioState;
  homePage: HomePage;
  loginPage: LoginPage;
  registerPage: RegisterPage;
  editorPage: ArticleEditorPage;
  articlePage: ArticlePage;
};

export const test = base.extend<Fixtures>({
  logger: async ({}, use, testInfo) => {
    const logger = new ApiLogger(randomUUID());
    await use(logger);
    if (testInfo.status !== testInfo.expectedStatus) {
      await testInfo.attach('api-calls.log', { body: logger.toString(), contentType: 'text/plain' });
    }
  },

  // Same correlation id on browser and API requests, so app logs can be matched to a test.
  extraHTTPHeaders: async ({ logger }, use) => {
    await use({ 'x-correlation-id': logger.correlationId });
  },

  // Scenarios tagged @guest start signed out; all others reuse the setup user's session.
  storageState: async ({ $tags, storageState }, use) => {
    await use($tags.includes('@guest') ? { cookies: [], origins: [] } : storageState);
  },

  authUser: async ({}, use) => {
    await use(readAuthUser());
  },

  api: async ({ request, logger, authUser }, use) => {
    const api = new ConduitApi(request, logger);
    api.authenticate(authUser.token);
    await use(api);
  },

  // Deletes articles a scenario created. 404 is fine: the scenario may have deleted it already.
  cleanup: async ({ api }, use) => {
    const slugs: string[] = [];
    await use({ trackArticle: (slug) => slugs.push(slug) });
    for (const slug of slugs) {
      try {
        await api.deleteArticle(slug);
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 404)) throw error;
      }
    }
  },

  scenario: async ({}, use) => {
    await use({});
  },

  homePage: async ({ page }, use) => use(new HomePage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  registerPage: async ({ page }, use) => use(new RegisterPage(page)),
  editorPage: async ({ page }, use) => use(new ArticleEditorPage(page)),
  articlePage: async ({ page }, use) => use(new ArticlePage(page)),
});
