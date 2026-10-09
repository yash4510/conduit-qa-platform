import type { Locator, Page } from '@playwright/test';
import type { NewArticle } from '../data/factories.ts';

export class ArticleEditorPage {
  private readonly page: Page;
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly bodyInput: Locator;
  readonly tagsInput: Locator;
  readonly publishButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.titleInput = page.getByPlaceholder('Article Title');
    this.descriptionInput = page.getByPlaceholder("What's this article about?");
    this.bodyInput = page.getByPlaceholder('Write your article (in markdown)');
    this.tagsInput = page.getByPlaceholder('Enter tags');
    this.publishButton = page.getByRole('button', { name: 'Publish Article' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/editor');
  }

  // Fills only the fields that are given, so a scenario can leave one out.
  async fill(article: Partial<NewArticle>): Promise<void> {
    if (article.title !== undefined) await this.titleInput.fill(article.title);
    if (article.description !== undefined) await this.descriptionInput.fill(article.description);
    if (article.body !== undefined) await this.bodyInput.fill(article.body);
    // The app adds a tag on Enter, one at a time.
    for (const tag of article.tagList ?? []) {
      await this.tagsInput.fill(tag);
      await this.tagsInput.press('Enter');
    }
  }

  async replaceTitle(title: string): Promise<void> {
    await this.titleInput.fill(title);
  }

  async publish(): Promise<void> {
    await this.publishButton.click();
  }
}
