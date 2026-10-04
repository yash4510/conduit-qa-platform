import type { Locator, Page } from '@playwright/test';
import { Navbar } from '../components/Navbar.ts';

// The app's inputs have no <label>, so placeholders are the most stable user-facing hook.
export class LoginPage {
  private readonly page: Page;
  readonly navbar: Navbar;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly errorMessages: Locator;

  constructor(page: Page) {
    this.page = page;
    this.navbar = new Navbar(page);
    this.emailInput = page.getByPlaceholder('Email');
    this.passwordInput = page.getByPlaceholder('Password');
    this.signInButton = page.getByRole('button', { name: 'Sign in' });
    // Plain <ul> with no role or label; the class is the only hook.
    this.errorMessages = page.locator('.error-messages');
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }
}
