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
  // CI writes a blob report per shard; a final job merges them into one HTML report.
  reporter: isCI ? [['list'], ['blob']] : [['list'], ['html', { open: 'on-failure' }]],
  expect: { toHaveScreenshot: { animations: 'disabled', maxDiffPixelRatio: 0.001 } },
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
    // Mocked API responses: no backend data needed, so no setup and no signed-in user.
    {
      name: 'network-chromium',
      testDir: 'tests/network',
      testMatch: /.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // Fixed size, time zone and locale, so screenshots depend on nothing but the UI.
    {
      name: 'visual-chromium',
      testDir: 'tests/visual',
      testMatch: /.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        timezoneId: 'UTC',
        locale: 'en-US',
        colorScheme: 'light',
      },
    },
    // One stateful journey in a single file; see the header of the spec for why it is serial.
    {
      name: 'serial-chromium',
      testDir: 'tests/e2e-serial',
      testMatch: /.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // Fresh user per test, like the hybrid project.
    {
      name: 'a11y-chromium',
      testDir: 'tests/a11y',
      testMatch: /.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // Firefox runs in the nightly matrix; pull requests stay on Chromium for speed.
    {
      name: 'ui-firefox',
      testDir: bddTestDir,
      dependencies: ['setup'],
      use: { ...devices['Desktop Firefox'], storageState: STORAGE_STATE },
    },
    // No browser and no shared user: every API test registers its own users.
    { name: 'api', testDir: 'tests/api', testMatch: /.*\.spec\.ts/ },
    {
      name: 'hybrid-chromium',
      testDir: 'tests/hybrid',
      testMatch: /.*\.spec\.ts/,
      // Fresh user per test (signInAs), so no shared session and no setup dependency.
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'hybrid-firefox',
      testDir: 'tests/hybrid',
      testMatch: /.*\.spec\.ts/,
      use: { ...devices['Desktop Firefox'] },
    },
  ],
});
