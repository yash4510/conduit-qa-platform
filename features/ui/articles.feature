@ui
Feature: Articles
  Signed-in users can publish, edit and delete their own articles.

  @smoke
  Scenario: User can publish an article
    Given I am on the new article page
    When I publish a new article
    Then I see the article with its title, body and tags

  @smoke
  Scenario: Author can edit their article
    Given I have published an article
    And I am on that article's page
    When I change the article title
    Then I see the article with the new title

  @smoke
  Scenario: Author can delete their article
    Given I have published an article
    And I am on that article's page
    When I delete the article
    Then I am taken to the home page
    And the article no longer exists

  @regression
  Scenario: Author sees edit and delete buttons on their article
    Given I have published an article
    And I am on that article's page
    Then I see the edit and delete buttons

  @regression
  Scenario: Reader does not see edit and delete buttons on someone else's article
    Given another author has published an article
    And I am on that article's page
    Then I do not see the edit and delete buttons

  @regression @guest
  Scenario: Guest can read an article
    Given another author has published an article
    And I am on that article's page
    Then I see the article with its title, body and tags

  # Defect: after the API answers 422 the app throws inside its ARTICLE_SUBMITTED reducer (it reads
  # payload.article.slug on an error response), so no message appears and Publish stays disabled.
  @regression @known-defect @fail
  Scenario: Publishing an article without a title is rejected
    Given I am on the new article page
    When I publish an article without a title
    Then I see the error "title can't be blank"

  # Defect: after the API answers 422 the app throws inside its ARTICLE_SUBMITTED reducer (it reads
  # payload.article.slug on an error response), so no message appears and Publish stays disabled.
  @regression @known-defect @fail
  Scenario: Publishing an article with a title that already exists is rejected
    Given I have published an article
    And I am on the new article page
    When I publish another article with the same title
    Then I see the error "title must be unique"
