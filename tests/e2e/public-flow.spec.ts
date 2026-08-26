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

  await expect(page.getByRole("tab", { name: "Student", selected: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue as student with Google" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue as student with GitHub" })).toBeVisible();
  await page.getByRole("tab", { name: "Coordinator" }).click();
  await expect(page.getByRole("tab", { name: "Coordinator", selected: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue as coordinator with Google" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue as coordinator with GitHub" })).toBeVisible();
  await expect(page.getByText(/linkedin/i)).toHaveCount(0);
});

test("login interactions use the PlaceFlow dark palette", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("placeflow-theme", "dark"));
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  const studentTab = page.getByRole("tab", { name: "Student" });
  const coordinatorTab = page.getByRole("tab", { name: "Coordinator" });
  const google = page.getByRole("button", { name: "Continue as student with Google" });
  const github = page.getByRole("button", { name: "Continue as student with GitHub" });

  await expect(studentTab).toHaveCSS("background-color", "rgb(255, 106, 70)");
  await studentTab.hover();
  await expect(studentTab).toHaveCSS("background-color", "rgb(255, 138, 108)");
  await coordinatorTab.hover();
  await expect(coordinatorTab).toHaveCSS("background-color", "rgb(32, 35, 31)");

  await expect(google).toHaveCSS("background-color", "rgb(255, 253, 248)");
  await google.hover();
  await expect(google).toHaveCSS("background-color", "rgb(233, 227, 215)");
  await expect(github).toHaveCSS("background-color", "rgb(32, 35, 31)");
  await github.hover();
  await expect(github).toHaveCSS("background-color", "rgb(26, 29, 26)");
});

test("document metadata exposes the PlaceFlow mark as the app icon", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", /\/icon\.svg/);
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
