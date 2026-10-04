// Seeds the local app with demo users and articles for manual exploration and demos.
// Tests do NOT use this data; each test creates its own.
// Usage: docker compose up -d --wait && npm run seed   (reset first with: docker compose down -v)
import { execFileSync } from 'node:child_process';
import { faker } from '@faker-js/faker';
import { request } from '@playwright/test';
import { ConduitApi } from '../api/client.ts';
import { buildArticle, buildComment, type NewUser } from '../data/factories.ts';
import { env } from '../utils/env.ts';
import { ApiLogger } from '../utils/logger.ts';

const USERS = 3;
const ARTICLES_PER_USER = 3;

// Fixed seed: every run produces the same users and content (stable screenshots).
faker.seed(2026);

const users: NewUser[] = Array.from({ length: USERS }, (_, i) => ({
  username: `demo_user_${i + 1}`,
  email: `demo_user_${i + 1}@example.test`,
  password: env.USER_PASSWORD,
}));

const context = await request.newContext();
const logger = new ApiLogger(`seed-${Date.now()}`);

try {
  // Refuse to seed twice: the fixed usernames would collide and articles would duplicate.
  const probe = await context.post(`${env.API_URL}/users/login`, {
    data: { user: { email: users[0]!.email, password: env.USER_PASSWORD } },
  });
  if (probe.ok()) {
    console.log('Already seeded. Reset with: docker compose down -v && docker compose up -d --wait');
    process.exit(0);
  }

  const clients: ConduitApi[] = [];
  const slugs: string[] = [];
  for (const user of users) {
    const api = new ConduitApi(context, logger);
    await api.register(user);
    for (let i = 0; i < ARTICLES_PER_USER; i++) {
      slugs.push((await api.createArticle(buildArticle())).slug);
    }
    clients.push(api);
  }

  // Each user comments on and favourites the other users' articles, and follows them.
  for (const [i, api] of clients.entries()) {
    for (const [j, slug] of slugs.entries()) {
      if (Math.floor(j / ARTICLES_PER_USER) === i) continue;
      await api.addComment(slug, buildComment());
      if (j % 2 === 0) await api.favorite(slug);
    }
    for (const [k, other] of users.entries()) {
      if (k !== i) await api.follow(other.username);
    }
  }

  // Known app defect: the global feed only lists articles by users flagged `demo`.
  // The API cannot set that flag, so set it in the database, as the upstream seed does.
  const names = users.map((u) => `'${u.username}'`).join(',');
  execFileSync('docker', [
    'compose',
    'exec',
    '-T',
    'db',
    'psql',
    '-U',
    'conduit',
    '-d',
    'conduit',
    '-q',
    '-c',
    `UPDATE "User" SET demo = true WHERE username IN (${names});`,
  ]);

  console.log(
    `Seeded ${USERS} users and ${slugs.length} articles. Log in as ${users[0]!.email} / ${env.USER_PASSWORD}`,
  );
} catch (error) {
  console.error(logger.toString());
  throw error;
} finally {
  await context.dispose();
}
