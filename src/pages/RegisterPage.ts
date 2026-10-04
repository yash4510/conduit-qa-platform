import type { Locator, Page } from '@playwright/test';
import { Navbar } from '../components/Navbar.ts';
import type { NewUser } from '../data/factories.ts';

export class RegisterPage {
  private readonly page: Page;
  readonly navbar: Navbar;
  readonly usernameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signUpButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.navbar = new Navbar(page);
    this.usernameInput = page.getByPlaceholder('Username');
    this.emailInput = page.getByPlaceholder('Email');
    this.passwordInput = page.getByPlaceholder('Password');
    this.signUpButton = page.getByRole('button', { name: 'Sign up' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/register');
  }

  async signUp(user: NewUser): Promise<void> {
    await this.usernameInput.fill(user.username);
    await this.emailInput.fill(user.email);
    await this.passwordInput.fill(user.password);
    await this.signUpButton.click();
  }
}
