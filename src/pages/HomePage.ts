import type { Locator, Page } from '@playwright/test';
import { Navbar } from '../components/Navbar.ts';

export class HomePage {
  private readonly page: Page;
  readonly navbar: Navbar;
  readonly globalFeedTab: Locator;
  readonly yourFeedTab: Locator;
  readonly emptyFeedMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.navbar = new Navbar(page);
    this.globalFeedTab = page.getByRole('link', { name: 'Global Feed' });
    this.yourFeedTab = page.getByRole('link', { name: 'Your Feed' });
    this.emptyFeedMessage = page.getByText('No articles are here... yet.');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async openYourFeed(): Promise<void> {
    await this.yourFeedTab.click();
  }

  // Article cards have no role or test id; filter the card class by the visible title.
  articlePreview(title: string): Locator {
    return this.page.locator('.article-preview').filter({ hasText: title });
  }
}
