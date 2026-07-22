import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("portfolio-preloader-shown", "1");
  });
});

test("keeps the hero staged while scrolling and reveals the header on upward intent", async ({
  page,
}) => {
  await page.goto("/");

  const heroLayout = await page.locator("#top").evaluate((hero) => {
    const sticky = hero.firstElementChild as HTMLElement | null;
    return {
      heroHeight: hero.getBoundingClientRect().height,
      viewportHeight: window.innerHeight,
      stickyPosition: sticky ? getComputedStyle(sticky).position : "",
    };
  });

  expect(heroLayout.heroHeight).toBeGreaterThan(heroLayout.viewportHeight * 1.4);
  expect(heroLayout.stickyPosition).toBe("sticky");

  const initialAbout = await page.locator("#about").evaluate((about) => ({
    top: about.getBoundingClientRect().top,
    opacity: getComputedStyle(about).opacity,
    blankSpace: about.firstElementChild?.getBoundingClientRect().height ?? 0,
  }));
  const initialAboutTop = initialAbout.top;
  expect(initialAboutTop).toBeGreaterThanOrEqual(heroLayout.viewportHeight * 1.1);
  expect(initialAboutTop).toBeLessThanOrEqual(heroLayout.viewportHeight * 1.2);
  expect(initialAbout.opacity).toBe("1");
  expect(initialAbout.blankSpace).toBeGreaterThan(heroLayout.viewportHeight * 0.3);

  const header = page.locator("header");
  await page.evaluate(() => window.scrollTo(0, 320));
  await page.waitForTimeout(700);
  expect((await header.boundingBox())?.y ?? 0).toBeLessThan(-20);
  expect(
    await page.locator("#about").evaluate((about) =>
      about.getBoundingClientRect().top
    )
  ).toBeLessThan(initialAboutTop);
  await expect(page.locator("#about")).toHaveCSS("opacity", "1");

  await page.evaluate(() => window.scrollTo(0, 120));
  await page.waitForTimeout(700);
  expect((await header.boundingBox())?.y ?? -100).toBeGreaterThanOrEqual(-1);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(700);
  expect((await header.boundingBox())?.y ?? -100).toBeGreaterThanOrEqual(-1);
});

test("uses the same auto-hide header behavior on activities", async ({ page }) => {
  await page.goto("/activities");
  await page.waitForTimeout(100);
  const header = page.locator("header");

  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(900);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  expect((await header.boundingBox())?.y ?? 0).toBeLessThan(-20);

  await page.mouse.wheel(0, -320);
  await page.waitForTimeout(900);
  expect((await header.boundingBox())?.y ?? -100).toBeGreaterThanOrEqual(-1);
});

test("does not trap the transition overlay on current-page nav links", async ({
  page,
}) => {
  await page.goto("/activities");
  await page
    .getByRole("banner")
    .getByRole("link", { name: "Activities" })
    .click();
  await page.waitForTimeout(900);

  await expect(page).toHaveURL(/\/activities$/);
  await expect(
    page.getByRole("heading", {
      name: /What I'm Working On|Yang Sedang Saya Kerjakan/i,
    })
  ).toBeVisible();
  await expect(page.getByTestId("route-transition-label")).toHaveText("");
  await expect(page.getByTestId("route-transition-overlay")).toHaveCSS(
    "transform",
    "matrix(1, 0, 0, 0, 0, 0)"
  );
});

test("removes sticky hero motion when reduced motion is requested", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const heroLayout = await page.locator("#top").evaluate((hero) => {
    const sticky = hero.firstElementChild as HTMLElement | null;
    return {
      heroHeight: hero.getBoundingClientRect().height,
      viewportHeight: window.innerHeight,
      stickyPosition: sticky ? getComputedStyle(sticky).position : "",
    };
  });

  expect(heroLayout.heroHeight).toBeLessThanOrEqual(heroLayout.viewportHeight);
  expect(heroLayout.stickyPosition).toBe("relative");
});
