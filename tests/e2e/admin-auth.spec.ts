import { expect, test } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  API_URL,
  loginAsAdmin,
} from "./helpers";

test("protects admin routes and supports login/logout", async ({ page }) => {
  await page.goto("/admin/activities");
  await expect(page).toHaveURL(/\/admin\/login\?reason=session-expired$/);

  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("The email or password is incorrect.")).toBeVisible();

  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/activities$/);

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("rejects cross-origin and invalid credentials at the Go boundary", async ({
  request,
}) => {
  const crossOrigin = await request.post(
    `${API_URL}/api/v1/admin/auth/login`,
    {
    headers: { Origin: "https://malicious.example" },
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    },
  );
  expect(crossOrigin.status()).toBe(403);

  const invalid = await request.post(`${API_URL}/api/v1/admin/auth/login`, {
    headers: { Origin: "http://localhost:3102" },
    data: { email: ADMIN_EMAIL, password: "wrong-password" },
  });
  expect(invalid.status()).toBe(401);
});

test("does not expose the public motion shell in admin", async ({ page }) => {
  await loginAsAdmin(page);
  await expect(page.locator(".public-experience")).toHaveCount(0);
  await expect(page.locator(".cursor-dot")).toHaveCount(0);

  await page.goto("/admin/route-that-does-not-exist");
  await expect(page.getByText("404")).toBeVisible();
  await expect(page.locator(".public-experience")).toHaveCount(0);
  await expect(page.locator(".cursor-dot")).toHaveCount(0);

  await page.goto("/activities");
  await expect(page.locator(".public-experience")).toHaveCount(1);
  await expect(page.locator(".cursor-dot")).toHaveCount(1);
});

test("recovers the active draft before redirecting an expired session", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page
    .locator("#activity-desktop-list")
    .getByRole("button", {
      name: /Building this portfolio's motion system/i,
    })
    .click();
  await page.getByLabel("Title").fill("Draf sebelum sesi berakhir");
  await page.context().clearCookies();
  await page.getByRole("button", { name: "Save changes" }).first().click();

  await expect(
    page
      .locator("[data-sonner-toast]")
      .getByText("Your admin session has expired")
  ).toBeVisible();
  await expect(
    page
      .locator("[data-sonner-toast]")
      .getByText(/Browser storage is full/i)
  ).toHaveCount(0);
  await expect(page).toHaveURL(/\/admin\/login\?reason=session-expired$/);

  const recoveredTitle = await page.evaluate(() => {
    const raw = localStorage.getItem("portfolio-activity-draft-recovery-v1");
    if (!raw) return null;
    return JSON.parse(raw).draft?.title?.id ?? null;
  });
  expect(recoveredTitle).toBe("Draf sebelum sesi berakhir");
});
