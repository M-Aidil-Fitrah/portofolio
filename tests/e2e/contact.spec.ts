import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("portfolio-preloader-shown", "1");
  });
});

test("rejects cross-origin and invalid contact requests", async ({ request }) => {
  const crossOrigin = await request.post("/api/contact", {
    headers: { Origin: "https://malicious.example" },
    data: {
      name: "Nadia",
      email: "nadia@example.com",
      category: "collaboration",
      message: "Hello",
      company: "",
    },
  });
  expect(crossOrigin.status()).toBe(403);

  const invalid = await request.post("/api/contact", {
    data: {
      name: "",
      email: "not-an-email",
      category: "unknown",
      message: "",
      company: "",
    },
  });
  expect(invalid.status()).toBe(400);
});

test("keeps the terminal contact experience clear and submits one message", async ({
  page,
}) => {
  let submittedBody: Record<string, unknown> | null = null;
  await page.route("**/api/contact", async (route) => {
    submittedBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.goto("/#contact");

  await expect(
    page.getByRole("heading", { name: "Say Hello" }),
  ).toBeVisible();
  await expect(page.getByText("mhdaidil.dev contact-v1.0")).toBeVisible();

  const form = page.getByRole("form", { name: "Send a message to Aidil" });
  await form.getByLabel("Name").fill("Nadia");
  await form.getByLabel("Email").fill("nadia@example.com");
  const collaboration = form.getByRole("radio", { name: "Collaboration" });
  await form.getByText("Collaboration", { exact: true }).click();
  await expect(collaboration).toBeChecked();
  await form.getByLabel("Message").fill("I would like to discuss a product build.");
  await form.getByRole("button", { name: "Send Message" }).click();

  await expect(form.getByRole("status")).toContainText("Message sent");
  expect(submittedBody).toMatchObject({
    name: "Nadia",
    email: "nadia@example.com",
    category: "collaboration",
    message: "I would like to discuss a product build.",
    company: "",
  });
  await expect(form.getByLabel("Name")).toHaveValue("");
  await expect(form.getByLabel("Email")).toHaveValue("");
  await expect(form.getByLabel("Message")).toHaveValue("");
});

test("keeps the contact terminal inside a narrow mobile viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/#contact");

  const section = page.locator("#contact");
  await expect(section).toBeVisible();
  const overflow = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewportWidth);

  const form = page.getByRole("form", { name: "Send a message to Aidil" });
  await expect(form.getByLabel("Name")).toBeVisible();
  await expect(form.getByRole("radio", { name: "Internship" })).toBeVisible();
  await expect(form.getByRole("button", { name: "Send Message" })).toBeVisible();
});
