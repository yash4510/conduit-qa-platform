import { expect } from '@playwright/test';
import { test } from '../../src/fixtures/index.ts';

// Throwaway: proves a failing browser test puts a trace, screenshot and video in the report.
test('deliberate failure to check traces reach the report', { tag: '@hybrid' }, async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'this heading does not exist' })).toBeVisible({ timeout: 2000 });
});
