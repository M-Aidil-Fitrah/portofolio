import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test("separates detail sections and navigates an unlimited fullscreen gallery", async ({
  page,
}) => {
  await loginAsAdmin(page);
  const saved = await page.evaluate(async () => {
    const post = {
      slug: "detail-gallery-fixture",
      title: {
        en: "Detail gallery fixture",
        id: "Fixture galeri detail",
      },
      caption: {
        en: "A focused fixture for the public activity detail.",
        id: "Fixture terfokus untuk detail aktivitas publik.",
      },
      body: {
        en: "The story stays separate from the gallery, attachments, discussion, and related activities.",
        id: "Cerita tetap terpisah dari galeri, lampiran, diskusi, dan aktivitas terkait.",
      },
      category: "project",
      date: "2026-07-30",
      tags: ["Next.js", "Gallery", "PDF"],
      cover: {
        id: "fixture-cover",
        src: "/assets/orang/FotoUSKcrop.webp",
        originalSrc: "/assets/orang/FotoUSKcrop.webp",
        alt: "Fixture activity cover",
        template: "none",
        status: "ready",
      },
      media: Array.from({ length: 5 }, (_, index) => ({
        id: `fixture-media-${index + 1}`,
        type: index === 3 ? "video" : "image",
        alt: `Fixture media ${index + 1}`,
        caption: {
          en: `Gallery caption ${index + 1}`,
          id: `Caption galeri ${index + 1}`,
        },
        status: "ready",
      })),
      attachments: [
        {
          id: "fixture-document",
          type: "document",
          filename: "CV Aidil (Inggris).pdf",
          mimeType: "application/pdf",
          size: 128000,
          originalSrc: "/assets/cv/CV Aidil (Inggris).pdf",
          downloadSrc: "/assets/cv/CV Aidil (Inggris).pdf",
          previewSrc: "/assets/cv/CV Aidil (Inggris).pdf",
          pageCount: 2,
          status: "ready",
          label: {
            en: "CV Preview Fixture",
            id: "Fixture Pratinjau CV",
          },
        },
      ],
      status: "published",
      pinned: false,
      progress: "shipped",
      likes: 4,
      comments: [
        {
          id: "fixture-comment",
          author: "Reviewer",
          body: "The discussion starts collapsed.",
          date: "2026-07-30",
        },
      ],
    };
    const response = await fetch("/api/admin/activities", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post }),
    });
    return response.ok;
  });
  expect(saved).toBe(true);

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
