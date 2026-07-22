import { expect, test } from "@playwright/test";

test("home page redirects to the workbench and opens the add-agent flow", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "A2A Workbench" })).toBeVisible();

  await page.getByRole("button", { name: "Add Agent" }).first().click();

  await expect(page.getByRole("dialog", { name: "Add Agent" })).toBeVisible();
  await expect(page.getByLabel("Agent URL")).toHaveValue("http://localhost:3001");
});

test("mobile workbench uses the compact app shell", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 812 });
  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { name: "Workbench" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Toggle Sidebar" })).toBeVisible();

  const navigation = page.getByRole("navigation", { name: "Primary navigation" });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Home" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(navigation.getByRole("link", { name: "Agents" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Chat" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Saved" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Tasks" })).toBeVisible();
});
