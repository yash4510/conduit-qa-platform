import type { Locator, Page } from '@playwright/test';

// The validation messages shown above the form on the sign in, sign up and editor pages.
export class ErrorList {
  // A plain <ul> with no role or label; the class is the only hook the app offers.
  readonly messages: Locator;

  constructor(page: Page) {
    this.messages = page.locator('.error-messages');
  }
}
