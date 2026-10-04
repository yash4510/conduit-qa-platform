import type { Locator, Page } from '@playwright/test';

export class SettingsPage {
  private readonly page: Page;
  readonly bioInput: Locator;
  readonly updateButton: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.bioInput = page.getByPlaceholder('Short bio about you');
    this.updateButton = page.getByRole('button', { name: 'Update Settings' });
    this.logoutButton = page.getByRole('button', { name: /click here to logout/ });
  }

  async goto(): Promise<void> {
    await this.page.goto('/settings');
  }

  async updateBio(bio: string): Promise<void> {
    await this.bioInput.fill(bio);
    await this.updateButton.click();
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }
}
