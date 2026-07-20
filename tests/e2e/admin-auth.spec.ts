import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, loginAsAdmin } from "./helpers";

test("protects admin routes and supports login/logout", async ({ page }) => {
  await page.goto("/admin/activities");
  await expect(page).toHaveURL(/\/admin\/login\?next=/);

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

test("rejects cross-origin and rate-limits repeated failures", async ({ request }) => {
  const crossOrigin = await request.post("/api/admin/login", {
    headers: { Origin: "https://malicious.example" },
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(crossOrigin.status()).toBe(403);

  const clientIp = "203.0.113.84";
  let response;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    response = await request.post("/api/admin/login", {
      headers: { "x-forwarded-for": clientIp },
      data: { email: ADMIN_EMAIL, password: "wrong-password" },
    });
  }

  expect(response?.status()).toBe(429);
  expect(Number(response?.headers()["retry-after"])).toBeGreaterThan(0);
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
