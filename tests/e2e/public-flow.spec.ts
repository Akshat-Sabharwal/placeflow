import { expect, test } from "@playwright/test";

test("landing presents one semantic placement workflow", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: /placement work/i }),
  ).toBeVisible();
  await expect(page.getByRole("img", { name: /abstract placeflow workflow/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Publish" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Apply" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Decide" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
});

test("login offers Google and GitHub only", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with GitHub" })).toBeVisible();
  await expect(page.getByText(/linkedin/i)).toHaveCount(0);
});

test("public page does not overflow a mobile viewport", async ({ page }) => {
  await page.goto("/");
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});

test("role workspaces redirect signed-out visitors", async ({ page }) => {
  await page.goto("/student");
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/coordinator");
  await expect(page).toHaveURL(/\/login$/);
});
