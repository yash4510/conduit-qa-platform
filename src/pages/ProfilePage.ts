import type { Locator, Page } from '@playwright/test';

export class ProfilePage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(username: string): Promise<void> {
    await this.page.goto(`/@${username}`);
  }

  // The button reads "Follow <name>" or "Unfollow <name>". The icon font adds a glyph in front of
  // the text, so match the end of the name. Regexes are case-sensitive, so "Follow" skips "Unfollow".
  followButton(username: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`Follow ${username}$`) });
  }

  unfollowButton(username: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`Unfollow ${username}$`) });
  }

  // Article cards have no role or test id; filter the card class by the visible title.
  articlePreview(title: string): Locator {
    return this.page.locator('.article-preview').filter({ hasText: title });
  }

  // The only button on a card is the heart; its text is the favorites count.
  favoriteButton(title: string): Locator {
    return this.articlePreview(title).getByRole('button');
  }
}
