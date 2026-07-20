import { expect, type Page } from "@playwright/test";

export const ADMIN_EMAIL = "admin@test.local";
export const ADMIN_PASSWORD = "test-password-123";

export async function loginAsAdmin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/activities$/);
  await expect(page.getByRole("heading", { name: "Activity studio" })).toBeVisible();
}

export async function switchToIndonesian(page: Page) {
  const toggle = page.getByRole("button", { name: "Switch to Indonesian" });
  if (await toggle.isVisible()) await toggle.click();
}
