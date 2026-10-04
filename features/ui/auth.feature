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
