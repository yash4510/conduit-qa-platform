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
