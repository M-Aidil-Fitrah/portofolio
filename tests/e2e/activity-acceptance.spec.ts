import { expect, test, type Route } from "@playwright/test";
import { createActivityCropMetadata } from "../../src/components/admin/activity/activity-image-crop";
import { slugifyActivity } from "../../src/components/admin/activity/activity-admin-config";
import {
  activityDraftRecoverySchema,
  parseActivity,
  type ActivityAttachment,
  type MediaAsset,
} from "../../src/lib/activity-schema";
import { loginAsAdmin } from "./helpers";

test("parses migrated activities with unbounded media and attachments", () => {
  const media = Array.from({ length: 64 }, (_, index): MediaAsset => ({
    id: `media-${index}`,
    type: index % 3 === 0 ? "video" : "image",
    alt: `Media ${index}`,
    status: "ready",
  }));
  const attachments = Array.from(
    { length: 32 },
    (_, index): ActivityAttachment => ({
      id: `document-${index}`,
      type: "document",
      filename: `document-${index}.pdf`,
      mimeType: "application/pdf",
      size: index * 1024,
      status: "ready",
      label: {
        en: `Document ${index}`,
        id: `Dokumen ${index}`,
      },
    })
  );
  const current = activityFixture({ media, attachments });
  const parsed = parseActivity(current);

  expect(parsed.media).toHaveLength(64);
  expect(parsed.attachments).toHaveLength(32);

  const { attachments: legacyDocuments, ...legacy } = current;
  const migrated = parseActivity({
    ...legacy,
    cover: "/assets/orang/FotoUSKcrop.webp",
    documents: legacyDocuments,
  });
  expect(migrated.cover?.src).toBe("/assets/orang/FotoUSKcrop.webp");
  expect(migrated.cover?.template).toBe("none");
  expect(migrated.attachments).toHaveLength(32);

  const recovery = activityDraftRecoverySchema.parse({
    version: 1,
    selectedSlug: null,
    draft: current,
    contentLocale: "id",
    savedAt: "2026-07-30T00:00:00.000Z",
  });
  expect(recovery.version).toBe(2);
  expect(recovery.draft.media).toHaveLength(64);
});

test("keeps slug generation stable and normalizes crop metadata", async ({
  page,
}) => {
  expect(slugifyActivity("  Proyek Akhir 2026!  ")).toBe(
    "proyek-akhir-2026"
  );
  const crop = createActivityCropMetadata({
    position: { x: Number.NaN, y: 18 },
    area: { x: -10, y: 110, width: 0, height: 180 },
    zoom: -2,
    rotation: 720,
    aspectRatio: 0,
  });
  expect(crop).toEqual({
    position: { x: 0, y: 18 },
    area: { x: 0, y: 100, width: 0.0001, height: 100 },
    zoom: 0.01,
    rotation: 360,
    aspectRatio: 0.01,
  });

  await loginAsAdmin(page);
  await page.getByRole("button", { name: "New post" }).click();
  await page.getByLabel("Title").fill("Judul Indonesia Stabil");
  await expect(
    page.getByRole("textbox", { name: "Slug", exact: true })
  ).toHaveValue("judul-indonesia-stabil");

  await page
    .locator("form")
    .getByRole("button", { name: "English" })
    .click();
  await page.getByLabel("Title").fill("A Completely Different English Title");
  await expect(
    page.getByRole("textbox", { name: "Slug", exact: true })
  ).toHaveValue("judul-indonesia-stabil");
});

test("retries a failed media upload and preserves the trailing add tile", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.getByRole("button", { name: "New post" }).click();
  const failPresign = async (route: Route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "storage_unavailable",
          message: "Temporary test failure",
        },
        request_id: "e2e-retry",
      }),
    });
  };
  await page.route("**/api/v1/admin/assets/uploads", failPresign);

  await page
    .locator('input[type="file"][accept="image/*,video/*"]')
    .setInputFiles({
      name: "retry-image.png",
      mimeType: "image/png",
      buffer: tinyPng(),
    });

  const tile = page.locator("[data-media-tile]").first();
  await expect(tile).toHaveAttribute("data-media-status", "failed");
  await expect(
    page.locator("[data-sonner-toast]").getByText("1 media files failed")
  ).toBeVisible();
  await expect(page.locator("[data-media-add-tile]")).toBeVisible();

  await page.unroute("**/api/v1/admin/assets/uploads", failPresign);
  await tile.getByRole("button", { name: "Retry" }).click();

  await expect(tile).toHaveAttribute("data-media-status", "ready");
  await expect(
    page.locator("[data-sonner-toast]").getByText("1 media files added")
  ).toBeVisible();
  await expect(page.locator("[data-media-add-tile]")).toHaveCount(1);
  await expect(page.locator("[data-media-add-tile]")).toBeVisible();
});

function activityFixture({
  media,
  attachments,
}: {
  media: MediaAsset[];
  attachments: ActivityAttachment[];
}) {
  return {
    slug: "unbounded-contract-fixture",
    title: { en: "Contract fixture", id: "Fixture kontrak" },
    caption: { en: "Caption", id: "Caption" },
    body: { en: "Body", id: "Isi" },
    category: "project" as const,
    date: "2026-07-30",
    tags: ["Zod"],
    cover: null,
    media,
    attachments,
    status: "draft" as const,
    pinned: false,
    likes: 0,
    comments: [],
  };
}

function tinyPng() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64"
  );
}
