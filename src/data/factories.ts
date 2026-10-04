import { faker } from '@faker-js/faker';
import { env } from '../utils/env.ts';

export type NewUser = { username: string; email: string; password: string };
export type NewArticle = { title: string; description: string; body: string; tagList: string[] };

// A short random suffix keeps data unique when tests run in parallel against one database.
const unique = (): string => faker.string.alphanumeric(8).toLowerCase();

export function buildUser(): NewUser {
  const username = `${faker.internet.username().replace(/[^a-zA-Z0-9]/g, '')}${unique()}`;
  return { username, email: `${username}@example.test`, password: env.USER_PASSWORD };
}

export function buildArticle(): NewArticle {
  return {
    title: `${faker.lorem.sentence({ min: 3, max: 6 }).replace(/\.$/, '')} ${unique()}`,
    description: faker.lorem.sentence(),
    body: faker.lorem.paragraphs(3),
    tagList: faker.helpers.uniqueArray(() => faker.word.noun(), 2),
  };
}

export function buildComment(): string {
  return faker.lorem.sentences(2);
}
