@ui
Feature: Authentication
  Visitors can create an account and sign in; signed-in users are recognised.

  @smoke @guest
  Scenario: Guest sees sign in and sign up links
    Given I am on the home page
    Then I see the sign in and sign up links

  @smoke @guest
  Scenario: Visitor can sign up for a new account
    Given I am on the sign up page
    When I sign up with new account details
    Then I am signed in as that new user

  @smoke @guest
  Scenario: Registered user can sign in
    Given a registered user
    And I am on the sign in page
    When I sign in with that user's credentials
    Then I am signed in as that new user

  @smoke @guest
  Scenario: Sign in with a wrong password is rejected
    Given a registered user
    And I am on the sign in page
    When I sign in with a wrong password
    Then I see the error "email or password is invalid"

  @smoke
  Scenario: Signed-in user sees their username in the navbar
    Given I am on the home page
    Then I am signed in as the test user

  @regression @guest
  Scenario: Sign up with an email that is already registered is rejected
    Given a registered user
    And I am on the sign up page
    When I sign up with that user's email and a new username
    Then I see the error "email has already been taken"

  @regression @guest
  Scenario: Sign up with a username that is already taken is rejected
    Given a registered user
    And I am on the sign up page
    When I sign up with that user's username and a new email
    Then I see the error "username has already been taken"

  @regression @guest
  Scenario: Sign in with an email that is not registered is rejected
    Given I am on the sign in page
    When I sign in with an unregistered email
    Then I see the error "email or password is invalid"

  @regression
  Scenario: Signed-in user can sign out
    Given I am on the settings page
    When I sign out
    Then I see the sign in and sign up links

  @regression @guest
  Scenario: Guest is asked to sign in before commenting
    Given another author has published an article
    And I am on that article's page
    Then I am asked to sign in to comment
