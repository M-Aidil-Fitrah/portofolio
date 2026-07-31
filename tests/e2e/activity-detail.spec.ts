import { expect, test } from "@playwright/test";
import { API_URL } from "./helpers";

test("separates detail sections and navigates an unlimited fullscreen gallery", async ({
  page,
}) => {
  await page.goto("/activities/detail-gallery-fixture");
  const detail = page.locator("[data-activity-detail]");
  await expect(detail.locator('[data-detail-section="cover"]')).toBeVisible();
  await expect(detail.locator('[data-detail-section="story"]')).toBeVisible();
  await expect(detail.locator('[data-detail-section="gallery"]')).toBeVisible();
  await expect(
    detail.locator('[data-detail-section="attachments"]')
  ).toBeVisible();
  await expect(
    detail.locator('[data-detail-section="comments"]')
  ).toBeVisible();
  await expect(detail.locator('[data-detail-section="related"]')).toBeVisible();
  await expect(
    detail.getByLabel("Activity actions").getByRole("button")
  ).toHaveCount(2);

  const gallery = detail.locator("[data-activity-gallery]");
  await expect(gallery).toHaveAttribute("data-gallery-total", "5");
  await expect(gallery.locator("[data-detail-media]")).toHaveCount(3);
  await detail.getByRole("button", { name: "View all (5)" }).click();

  const galleryDialog = page.getByRole("dialog", {
    name: "Activity gallery",
  });
  await expect(galleryDialog).toHaveAttribute("data-gallery-index", "0");
  await expect(galleryDialog).toHaveAttribute("data-gallery-total", "5");
  await expect(
    galleryDialog.locator("[data-gallery-active-media]")
  ).toHaveCount(1);

  await page.keyboard.press("ArrowRight");
  await expect(galleryDialog).toHaveAttribute("data-gallery-index", "1");
  await galleryDialog
    .getByRole("button", { name: "Next media" })
    .click();
  await expect(galleryDialog).toHaveAttribute("data-gallery-index", "2");
  await galleryDialog.dispatchEvent("pointerdown", {
    pointerType: "touch",
    clientX: 300,
  });
  await galleryDialog.dispatchEvent("pointerup", {
    pointerType: "touch",
    clientX: 120,
  });
  await expect(galleryDialog).toHaveAttribute("data-gallery-index", "3");
  await galleryDialog
    .getByRole("button", { name: "Previous media" })
    .click();
  await expect(galleryDialog).toHaveAttribute("data-gallery-index", "2");
  await galleryDialog.getByRole("button", { name: "Close gallery" }).click();
  await expect(galleryDialog).toBeHidden();

  const comments = detail.locator("[data-activity-comments]");
  await expect(comments).toHaveAttribute("data-comments-expanded", "false");
  await expect(page.getByLabel("Name")).toHaveCount(0);
  await comments.getByRole("button", { name: "Show comments" }).click();
  await expect(comments).toHaveAttribute("data-comments-expanded", "true");
  await expect(page.getByLabel("Name")).toBeVisible();
  await comments.getByRole("button", { name: "Hide comments" }).click();
  await expect(comments).toHaveAttribute("data-comments-expanded", "false");

  await detail
    .getByRole("button", { name: "Preview document 1" })
    .click();
  const previewDelivery = await page.evaluate(async (apiUrl) => {
    let source: string | undefined;
    try {
      const activity = await fetch(
        `${apiUrl}/api/v1/activities/detail-gallery-fixture`,
      ).then((response) => response.json());
      source = activity.assets.find(
        (asset: { role: string }) => asset.role === "attachment",
      )?.preview_src;
      // Public asset URLs redirect to object storage, which a credentialed
      // request cannot follow across origins.
      const response = await fetch(new URL(source ?? "", apiUrl));
      return {
        bytes: (await response.arrayBuffer()).byteLength,
        ok: response.ok,
        source,
        status: response.status,
        url: response.url,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
        source,
      };
    }
  }, API_URL);
  expect(
    previewDelivery,
    JSON.stringify(previewDelivery),
  ).toMatchObject({ ok: true });
  expect("bytes" in previewDelivery ? previewDelivery.bytes : 0).toBeGreaterThan(
    0,
  );
  const documentDialog = page.getByRole("dialog", {
    name: "CV Preview Fixture",
  });
  await expect(documentDialog.locator("[data-pdf-viewer]")).toBeVisible();
  await expect(documentDialog.locator("[data-pdf-page]")).toHaveCount(2);
  await documentDialog.getByRole("button", { name: "Close" }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    )
    .toBe(true);
  await expect(gallery.locator("[data-detail-media]")).toHaveCount(3);
});
