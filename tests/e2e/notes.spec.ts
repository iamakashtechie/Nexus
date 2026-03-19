import { test, expect } from "@playwright/test";

async function createNote(page: import("@playwright/test").Page, title: string, content: string) {
  await page.click('[data-testid="new-note-btn"]');
  const noteTitle = page.locator('[data-testid="note-title"]');
  await expect(noteTitle).toBeVisible();
  await noteTitle.fill(title);
  await page.click(".tiptap");
  await page.keyboard.type(content);
}

test.describe("Notes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="password"]', process.env.APP_PASSWORD ?? "");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/notes");
  });

  test("creates a new note", async ({ page }) => {
    const noteTitle = `My Test Note ${Date.now()}`;
    await createNote(page, noteTitle, "This is the content of my note.");
    await expect(page.getByText(noteTitle)).toBeVisible();
  });

  test("searches for a note", async ({ page }) => {
    const noteTitle = `Searchable Note ${Date.now()}`;
    await createNote(page, noteTitle, "search content");

    await page.fill('[data-testid="search-input"]', noteTitle);
    await expect(page.getByText(noteTitle)).toBeVisible();
  });

  test("deletes a note", async ({ page }) => {
    const noteTitle = `Delete Me ${Date.now()}`;
    await createNote(page, noteTitle, "delete content");

    page.once("dialog", (dialog) => dialog.accept());
    await page.click('[data-testid="delete-note"]');
    await expect(page.getByText(noteTitle)).not.toBeVisible();
  });
});
