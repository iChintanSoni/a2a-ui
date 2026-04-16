import { expect, test } from "@playwright/test";

test("home page opens the add-agent flow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Agent to Agent Network" })).toBeVisible();

  await page.getByRole("button", { name: "Add Agent" }).click();

  await expect(page.getByRole("dialog", { name: "Add Agent" })).toBeVisible();
  await expect(page.getByLabel("Agent URL")).toHaveValue("http://localhost:3001");
});
