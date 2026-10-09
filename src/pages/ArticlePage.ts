import type { Locator, Page } from '@playwright/test';

export class ArticlePage {
  private readonly page: Page;
  readonly title: Locator;
  readonly body: Locator;
  readonly tags: Locator;
  readonly editLink: Locator;
  readonly deleteButton: Locator;
  readonly commentInput: Locator;
  readonly postCommentButton: Locator;
  readonly signInToCommentPrompt: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.getByRole('heading', { level: 1 });
    this.body = page.locator('.article-content');
    this.tags = page.locator('.article-content .tag-list li');
    this.editLink = page.getByRole('link', { name: /Edit Article/ });
    this.deleteButton = page.getByRole('button', { name: /Delete Article/ });
    this.commentInput = page.getByPlaceholder('Write a comment...');
    this.postCommentButton = page.getByRole('button', { name: 'Post Comment' });
    this.signInToCommentPrompt = page.getByText('to add comments on this article');
  }

  async goto(slug: string): Promise<void> {
    await this.page.goto(`/article/${slug}`);
  }

  // The slug is only known after the app creates or renames the article.
  async waitForSlug(): Promise<string> {
    await this.page.waitForURL(/\/article\/[^/]+$/);
    return decodeURIComponent(new URL(this.page.url()).pathname.split('/').pop() ?? '');
  }

  comment(text: string): Locator {
    return this.page.locator('.card').filter({ hasText: text });
  }

  async postComment(text: string): Promise<void> {
    await this.commentInput.fill(text);
    await this.postCommentButton.click();
  }

  async deleteComment(text: string): Promise<void> {
    // The delete control is a bare <i> icon with no role, text or label (an a11y defect).
    await this.comment(text).locator('.mod-options .ion-trash-a').click();
  }
}
