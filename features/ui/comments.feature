@ui
Feature: Comments
  Signed-in users can comment on articles and remove their own comments.

  @smoke
  Scenario: User can comment on an article
    Given I have published an article
    And I am on that article's page
    When I post a comment
    Then I see my comment under the article

  @smoke
  Scenario: Author can delete their comment
    Given I have published an article
    And I have commented on that article
    And I am on that article's page
    When I delete my comment
    Then my comment is no longer shown

  @regression
  Scenario: Comment box is emptied after posting
    Given I have published an article
    And I am on that article's page
    When I post a comment
    Then the comment box is empty
