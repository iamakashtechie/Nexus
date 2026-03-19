import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/notes");
    await expect(page).toHaveURL("/login");
  });

  test("shows error on wrong password", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');
    await expect(page.getByText("Invalid password")).toBeVisible();
  });

  test("logs in with correct password and lands on notes", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="password"]', process.env.APP_PASSWORD ?? "");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/notes");
  });
});
