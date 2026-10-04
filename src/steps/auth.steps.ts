import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { ConduitApi } from '../api/client.ts';
import { buildUser } from '../data/factories.ts';
import { test } from '../fixtures/index.ts';

const { Given, When, Then } = createBdd(test);

Given('I am on the home page', async ({ homePage }) => {
  await homePage.goto();
});

Given('I am on the sign up page', async ({ registerPage }) => {
  await registerPage.goto();
});

Given('I am on the sign in page', async ({ loginPage }) => {
  await loginPage.goto();
});

// Created through the API: these scenarios test the sign-in form, not sign-up.
Given('a registered user', async ({ request, logger, scenario }) => {
  scenario.user = buildUser();
  await new ConduitApi(request, logger).register(scenario.user);
});

When('I sign up with new account details', async ({ registerPage, scenario }) => {
  scenario.user = buildUser();
  await registerPage.signUp(scenario.user);
});

When("I sign in with that user's credentials", async ({ loginPage, scenario }) => {
  await loginPage.signIn(scenario.user!.email, scenario.user!.password);
});

When('I sign in with a wrong password', async ({ loginPage, scenario }) => {
  await loginPage.signIn(scenario.user!.email, 'wrong-password');
});

Then('I see the sign in and sign up links', async ({ homePage }) => {
  await expect(homePage.navbar.signInLink).toBeVisible();
  await expect(homePage.navbar.signUpLink).toBeVisible();
});

Then('I am signed in as that new user', async ({ homePage, scenario }) => {
  await expect(homePage.navbar.userLink(scenario.user!.username)).toBeVisible();
  await expect(homePage.navbar.signInLink).toBeHidden();
});

Then('I am signed in as the test user', async ({ homePage, authUser }) => {
  await expect(homePage.navbar.userLink(authUser.username)).toBeVisible();
});

Then('I see the error {string}', async ({ loginPage }, message: string) => {
  await expect(loginPage.errorMessages).toContainText(message);
});
