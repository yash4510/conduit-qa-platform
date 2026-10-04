import type { Locator, Page } from '@playwright/test';

export class Navbar {
  private readonly root: Locator;
  readonly signInLink: Locator;
  readonly signUpLink: Locator;
  readonly newPostLink: Locator;
  readonly settingsLink: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('navigation');
    this.signInLink = this.root.getByRole('link', { name: 'Sign in' });
    this.signUpLink = this.root.getByRole('link', { name: 'Sign up' });
    // Regex: the link text is preceded by an icon and a non-breaking space.
    this.newPostLink = this.root.getByRole('link', { name: /New Post/ });
    this.settingsLink = this.root.getByRole('link', { name: /Settings/ });
  }

  // The profile link shows the signed-in user's name, so it doubles as "who is logged in".
  userLink(username: string): Locator {
    return this.root.getByRole('link', { name: username });
  }
}
