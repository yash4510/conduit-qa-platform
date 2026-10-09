import { expect } from '@playwright/test';
import { test } from '../../src/fixtures/index.ts';

// Throwaway: proves a failing @smoke test turns the PR gate red.
test('deliberate failure to check the CI failure path', { tag: ['@api', '@smoke'] }, async ({ guest }) => {
  const tags = await guest.getTags();
  expect(tags.length).toBe(-1);
});
