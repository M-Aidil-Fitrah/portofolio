import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("portfolio-preloader-shown", "1");
  });
});

test("keeps the featured activity unique and uses a compact responsive grid", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/activities");

  const feed = page.locator("[data-activity-feed]");
  const featured = feed.locator("[data-featured-activity]");
  const grid = feed.locator("[data-activity-grid]");
  await expect(featured).toBeVisible();
  await expect(
    featured.locator('[data-activity-slug="portfolio-motion-system"]')
  ).toHaveCount(1);
  await expect(
    grid.locator('[data-activity-slug="portfolio-motion-system"]')
  ).toHaveCount(0);
  await expect(page.locator(".activity-month")).toHaveCount(0);
  await expect(feed.getByText("Read note")).toHaveCount(0);
  await expect(feed.getByText("Pinned", { exact: true })).toHaveCount(0);

  const cards = feed.locator("[data-activity-card]");
  const cardCount = await cards.count();
  expect(cardCount).toBeGreaterThan(1);
  for (let index = 0; index < cardCount; index += 1) {
    const tagCount = await cards
      .nth(index)
      .locator("[data-activity-card-tags] [title]")
      .count();
    expect(tagCount).toBeLessThanOrEqual(2);
  }

  await page.setViewportSize({ width: 820, height: 1180 });
  const tabletColumns = await grid.evaluate(
    (element) => getComputedStyle(element).gridTemplateColumns
  );
  expect(tabletColumns.trim().split(/\s+/)).toHaveLength(2);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileColumns = await grid.evaluate(
    (element) => getComputedStyle(element).gridTemplateColumns
  );
  expect(mobileColumns.trim().split(/\s+/)).toHaveLength(1);

  const search = page.getByLabel("Search activities…");
  await search.fill("motion system");
  await expect(feed).toHaveAttribute("data-filter-active", "true");
  await expect(featured).toHaveCount(0);
  await expect(
    grid.locator('[data-activity-slug="portfolio-motion-system"]')
  ).toHaveCount(1);

  await search.clear();
  await expect(feed).toHaveAttribute("data-filter-active", "false");
  await expect(featured).toBeVisible();

  await page.getByRole("button", { name: "Project", exact: true }).click();
  await expect(feed).toHaveAttribute("data-filter-active", "true");
  await expect(featured).toHaveCount(0);
  await expect(
    grid.locator('[data-activity-slug="portfolio-motion-system"]')
  ).toHaveCount(1);

  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect(feed).toHaveAttribute("data-filter-active", "false");
  await expect(featured).toBeVisible();
  await expect(
    grid.locator('[data-activity-slug="portfolio-motion-system"]')
  ).toHaveCount(0);
});
