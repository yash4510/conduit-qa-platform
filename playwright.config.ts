import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import { STORAGE_STATE } from './src/fixtures/auth.ts';
import { env } from './src/utils/env.ts';

const bddTestDir = defineBddConfig({
  features: 'features/ui/*.feature',
  steps: ['src/steps/*.ts', 'src/fixtures/index.ts'],
});

const isCI = !!process.env.CI;

export default defineConfig({
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'on-failure' }]],
  use: {
    baseURL: env.BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testDir: 'tests', testMatch: /auth\.setup\.ts/ },
    {
      name: 'ui-chromium',
      testDir: bddTestDir,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
    },
    // No browser and no shared user: every API test registers its own users.
    { name: 'api', testDir: 'tests/api', testMatch: /.*\.spec\.ts/ },
    {
      name: 'hybrid-chromium',
      testDir: 'tests/hybrid',
      testMatch: /.*\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
    },
  ],
});
