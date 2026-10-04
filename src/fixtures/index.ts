import { randomUUID } from 'node:crypto';
import { test as base } from 'playwright-bdd';
import { ApiError, ConduitApi } from '../api/client.ts';
import type { Article, User } from '../api/schemas.ts';
import { buildUser, type NewUser } from '../data/factories.ts';
import { ArticleEditorPage } from '../pages/ArticleEditorPage.ts';
import { ArticlePage } from '../pages/ArticlePage.ts';
import { HomePage } from '../pages/HomePage.ts';
import { ProfilePage } from '../pages/ProfilePage.ts';
import { SettingsPage } from '../pages/SettingsPage.ts';
import { LoginPage } from '../pages/LoginPage.ts';
import { RegisterPage } from '../pages/RegisterPage.ts';
import { env } from '../utils/env.ts';
import { ApiLogger } from '../utils/logger.ts';
import { readAuthUser, type AuthUser } from './auth.ts';

// Per-scenario state shared between steps (playwright-bdd recommends fixtures over a global World).
type ScenarioState = {
  user?: NewUser;
  article?: Pick<Article, 'slug' | 'title' | 'body' | 'tagList'>;
  comment?: string;
};

// The only origins a test browser may talk to: the frontend and the API.
const localOrigins = new Set([new URL(env.BASE_URL).origin, new URL(env.API_URL).origin]);

// A freshly registered user plus an API client signed in as them.
export type Session = { user: NewUser; profile: User; api: ConduitApi };

type Fixtures = {
  logger: ApiLogger;
  authUser: AuthUser;
  api: ConduitApi;
  cleanup: { trackArticle(slug: string): void };
  guest: ConduitApi;
  newSession: () => Promise<Session>;
  signInAs: (session: Session) => Promise<void>;
  scenario: ScenarioState;
  homePage: HomePage;
  loginPage: LoginPage;
  registerPage: RegisterPage;
  editorPage: ArticleEditorPage;
  articlePage: ArticlePage;
  profilePage: ProfilePage;
  settingsPage: SettingsPage;
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

  // The app loads icons, fonts and avatars from third-party hosts. Tests must only touch the local app,
  // and a slow CDN delays page load (and would make visual baselines flaky), so those requests are aborted.
  context: async ({ context }, use) => {
    await context.route(/.*/, (route) => {
      const { origin } = new URL(route.request().url());
      return localOrigins.has(origin) ? route.continue() : route.abort();
    });
    await use(context);
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

  // Not signed in. Pairs with newSession() for tests about who may do what.
  guest: async ({ request, logger }, use) => {
    await use(new ConduitApi(request, logger));
  },

  // Every call registers a brand-new user, so API tests never share data. Articles they
  // created are deleted at teardown.
  newSession: async ({ request, logger }, use) => {
    const sessions: Session[] = [];
    await use(async () => {
      const api = new ConduitApi(request, logger);
      const user = buildUser();
      const profile = await api.register(user);
      const session = { user, profile, api };
      sessions.push(session);
      return session;
    });
    for (const { api } of sessions) await api.cleanUp();
  },

  // Signs the browser in as a session's user, before the first navigation. The frontend keeps
  // its JWT in localStorage, and an init script runs before the app reads it.
  signInAs: async ({ page }, use) => {
    await use(async (session) => {
      await page.addInitScript((token) => window.localStorage.setItem('jwt', token), session.profile.token);
    });
  },

  scenario: async ({}, use) => {
    await use({});
  },

  homePage: async ({ page }, use) => use(new HomePage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  registerPage: async ({ page }, use) => use(new RegisterPage(page)),
  editorPage: async ({ page }, use) => use(new ArticleEditorPage(page)),
  articlePage: async ({ page }, use) => use(new ArticlePage(page)),
  profilePage: async ({ page }, use) => use(new ProfilePage(page)),
  settingsPage: async ({ page }, use) => use(new SettingsPage(page)),
});
