@ui
Feature: Favourites and follows
  Signed-in users can favourite articles, follow authors and read a feed of the authors they follow.

  @regression
  Scenario: User can favourite an article
    Given I am signed in as a new author who has published an article
    And I am on my profile page
    When I click the favourite button on the article
    Then the article shows 1 favourite

  @regression
  Scenario: User can remove a favourite
    Given I am signed in as a new author who has published an article
    And I have already favourited that article
    And I am on my profile page
    When I click the favourite button on the article
    Then the article shows 0 favourites

  @regression
  Scenario: User can follow an author
    Given I am signed in as a new reader
    And another author exists
    And I am on that author's profile page
    When I follow the author
    Then I see the unfollow button for the author

  @regression
  Scenario: User can unfollow an author
    Given I am signed in as a new reader
    And another author exists
    And I already follow that author
    And I am on that author's profile page
    When I unfollow the author
    Then I see the follow button for the author

  @regression
  Scenario: Articles by followed authors appear in the feed
    Given I am signed in as a new reader
    And another author has published an article
    And I already follow that author
    When I open my feed on the home page
    Then I see that article in the feed

  @regression
  Scenario: Feed is empty when following nobody
    Given I am signed in as a new reader
    When I open my feed on the home page
    Then I see that there are no articles
