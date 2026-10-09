import { expect } from '@playwright/test';
import { test } from '../../src/fixtures/index.ts';

test.describe('Tags', { tag: ['@api', '@regression'] }, () => {
  test('guest can read the popular tags', async ({ guest }) => {
    const tags = await guest.getTags();

    // The spec does not cap the list, but this backend returns the 10 most popular.
    expect(tags.length).toBeLessThanOrEqual(10);
    expect(new Set(tags).size).toBe(tags.length);
  });

  test('signed-in user sees the same kind of response', async ({ newSession }) => {
    const { api } = await newSession();

    const tags = await api.getTags();

    expect(tags.every((tag) => tag.length > 0)).toBe(true);
  });
});
