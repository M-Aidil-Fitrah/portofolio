import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { API_URL, loginAsAdmin, switchToIndonesian } from "./helpers";

test("guards and recovers unsaved drafts", async ({ page }) => {
  await loginAsAdmin(page);

  await expect(
    page.getByRole("heading", { name: "What would you like to work on?" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Create activity" }).click();

  const title = page.getByLabel("Title");
  await title.fill("Draf pemulihan otomatis");
  await page.waitForTimeout(500);
  page.once("dialog", (dialog) => dialog.accept());
  await page.reload();

  await expect(
    page.getByRole("button", { name: /Continue draft/i })
  ).toBeVisible();
  await page.getByRole("button", { name: /Continue draft/i }).click();
  await expect(page.getByText("Unsaved draft recovered")).toBeVisible();
  await expect(page.getByLabel("Title")).toHaveValue("Draf pemulihan otomatis");

  await page.getByRole("button", { name: "New post" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByLabel("Title")).toHaveValue("Draf pemulihan otomatis");

  await page.getByRole("button", { name: "New post" }).click();
  await dialog.getByRole("button", { name: "Discard changes" }).click();
  await expect(page.getByText("Create activity")).toBeVisible();
});

test("uses focused workspace navigation across desktop, tablet, and mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await loginAsAdmin(page);

  await expect(page.locator("#activity-desktop-list")).toBeVisible();
  await expect(page.getByLabel("Choose activity")).toBeHidden();
  await expect(page.getByLabel("Title")).toHaveCount(0);

  await page.setViewportSize({ width: 820, height: 1180 });
  await page.reload();
  await expect(page.locator("#activity-desktop-list")).toBeHidden();
  await expect(page.getByLabel("Choose activity")).toBeVisible();
  await page
    .getByLabel("Choose activity")
    .selectOption("portfolio-motion-system");
  await expect(page.getByLabel("Title")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "What would you like to work on?" })
  ).toBeVisible();
  await expect(page.locator("#activity-mobile-list")).toBeHidden();

  await page.getByRole("button", { name: "Edit activity" }).click();
  await expect(page.locator("#activity-mobile-list")).toBeVisible();
  await page
    .locator("#activity-mobile-list")
    .getByRole("button", {
      name: /Building this portfolio's motion system/i,
    })
    .click();
  await expect(page.getByLabel("Title")).toBeVisible();
  await expect(page.locator("#activity-mobile-list")).toBeHidden();

  await page.getByRole("button", { name: "Activity list" }).click();
  await expect(page.locator("#activity-mobile-list")).toBeVisible();
  await page.getByRole("button", { name: /Workspace home/i }).click();
  await expect(
    page.getByRole("heading", { name: "What would you like to work on?" })
  ).toBeVisible();

  await page
    .locator('input[type="file"][accept="image/*"]')
    .setInputFiles({
      name: "activity-cover.png",
      mimeType: "image/png",
      buffer: tinyPng(),
    });
  await expect(
    page.locator("[data-sonner-toast]").getByText("Cover uploaded")
  ).toBeVisible();
  await expect(page.getByLabel("Title")).toBeVisible();
  const coverDelivery = await page
    .getByRole("img", { name: "activity cover" })
    .evaluate(async (image) => {
      const source = (image as HTMLImageElement).currentSrc;
      try {
        const response = await fetch(source, { credentials: "include" });
        return {
          naturalWidth: (image as HTMLImageElement).naturalWidth,
          ok: response.ok,
          status: response.status,
          url: response.url,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : String(error),
          naturalWidth: (image as HTMLImageElement).naturalWidth,
          source,
        };
      }
    });
  expect(
    coverDelivery,
    JSON.stringify(coverDelivery),
  ).toMatchObject({ ok: true });
  expect(coverDelivery.naturalWidth).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Crop cover" }).click();
  const coverCropper = page.getByRole("dialog", { name: "Crop image" });
  await expect(coverCropper).toBeVisible();
  await expect(
    coverCropper.getByRole("button", { name: "16:9" })
  ).toHaveAttribute("aria-pressed", "true");
  await coverCropper.getByRole("button", { name: /Left 90/ }).click();
  await expect(
    coverCropper.getByRole("slider", { name: "Rotation" })
  ).toHaveValue("-90");
  await expect(
    coverCropper.getByRole("button", { name: "Apply crop" })
  ).toBeEnabled();
  await coverCropper.getByRole("button", { name: "Apply crop" }).click();
  await expect(
    page.locator("[data-sonner-toast]").getByText("Crop applied")
  ).toBeVisible();
  await expect(coverCropper).toBeHidden();

  await page.getByRole("button", { name: "Editorial" }).click();
  await expect(
    page.locator("[data-activity-cover]")
  ).toHaveAttribute("data-cover-template", "editorial");
  await page.getByRole("button", { name: "Render cover" }).click();
  await expect(
    page
      .locator("[data-sonner-toast]")
      .getByText("Lossless WebP cover rendered")
  ).toBeVisible();
  // Covers are no longer rasterized to a WebP data URL in the browser; the
  // template is stored on the cover and composed at render time. What has to
  // survive is the chosen template, so the draft can be recovered intact.
  // Draft recovery is debounced, so poll rather than race the timer.
  const readRecoveredCover = () =>
    page.evaluate(() => {
      const raw = localStorage.getItem("portfolio-activity-draft-recovery-v1");
      return raw ? JSON.parse(raw).draft.cover : null;
    });
  await expect
    .poll(async () => (await readRecoveredCover())?.template ?? null)
    .toBe("editorial");

  const renderedCover = await readRecoveredCover();
  expect(renderedCover.status).toBe("ready");
  // The cropper replaces the source with its own render, so recovery has to
  // carry that image — otherwise an interrupted session loses the crop.
  expect(renderedCover.src).toMatch(/^data:image\//);
});

test("creates rich media, publishes, syncs publicly, and deletes", async ({
  page,
  browser,
  baseURL,
}) => {
  await loginAsAdmin(page);
  await page.getByRole("button", { name: "New post" }).click();

  await page.getByLabel("Title").fill("Catatan integrasi publik admin");
  await page.getByLabel("Short caption").fill("Caption Indonesia untuk pengujian.");
  await page.getByLabel("Full story").fill("Cerita lengkap Indonesia untuk pengujian alur.");

  await page.locator("form").getByRole("button", { name: "English" }).click();
  await page.getByLabel("Title").fill("Public admin integration note");
  await page.getByLabel("Short caption").fill("English caption for the workflow test.");
  await page.getByLabel("Full story").fill("Complete English story for the workflow test.");

  await page.getByLabel("Add activity cover").setInputFiles({
    name: "workflow-cover.png",
    mimeType: "image/png",
    buffer: tinyPng(),
  });
  await expect(
    page.locator("[data-sonner-toast]").getByText("Cover uploaded")
  ).toBeVisible();
  await page.getByRole("button", { name: "Custom PNG" }).click();
  await page.getByLabel("Add transparent PNG").setInputFiles({
    name: "workflow-twibbon.png",
    mimeType: "image/png",
    buffer: await transparentPng(),
  });
  await expect(
    page
      .locator("[data-sonner-toast]")
      .getByText("Transparent overlay added")
  ).toBeVisible();
  await page.getByRole("button", { name: "Render cover" }).click();
  await expect(
    page
      .locator("[data-sonner-toast]")
      .getByText("Lossless WebP cover rendered")
  ).toBeVisible();

  const mediaSection = page.locator("section[data-upload-active]");
  await mediaSection.evaluate((node) => {
    node.setAttribute("data-max-observed-uploads", "0");
    const recordActiveUploads = () => {
      const active = Number(node.getAttribute("data-upload-active") ?? "0");
      const observed = Number(
        node.getAttribute("data-max-observed-uploads") ?? "0"
      );
      node.setAttribute(
        "data-max-observed-uploads",
        String(Math.max(active, observed))
      );
    };
    recordActiveUploads();
    new MutationObserver(recordActiveUploads).observe(node, {
      attributes: true,
      attributeFilter: ["data-upload-active"],
    });
  });

  const upload = page.locator('input[type="file"][accept="image/*,video/*"]');
  await upload.setInputFiles(
    Array.from({ length: 6 }, (_, index) => ({
      name: `workflow-image-${index + 1}.png`,
      mimeType: "image/png",
      buffer: tinyPng(),
    })),
  );

  await expect(
    page.locator("[data-sonner-toast]").getByText("6 media files added")
  ).toBeVisible();
  await expect(mediaSection).toHaveAttribute("data-media-count", "6");
  await expect(page.locator("[data-media-tile]")).toHaveCount(6);
  await expect(page.locator("[data-media-add-tile]")).toHaveCount(1);
  await expect(page.locator("[data-media-add-tile]")).toBeVisible();
  await expect(mediaSection).toHaveAttribute("data-max-observed-uploads", "3");

  const firstTile = page.locator("[data-media-tile]").first();
  await firstTile.getByRole("button", { name: "Edit" }).click();
  await expect(page.getByLabel("Alternative text")).toHaveCount(1);
  await page.getByLabel("Alternative text").fill("Workflow preview image");
  await page.getByLabel("Caption (Indonesian)").fill("Caption media Indonesia");
  await page.getByLabel("Caption (English)").fill("English media caption");

  await page.getByRole("button", { name: "Crop image" }).click();
  const imageCropper = page.getByRole("dialog", { name: "Crop image" });
  await imageCropper.getByRole("button", { name: "1:1" }).click();
  await expect(
    imageCropper.getByRole("button", { name: "1:1" })
  ).toHaveAttribute("aria-pressed", "true");
  await imageCropper.getByRole("slider", { name: "Zoom" }).focus();
  await imageCropper
    .getByRole("slider", { name: "Zoom" })
    .press("ArrowRight");
  await imageCropper.getByRole("button", { name: /Right 90/ }).click();
  await imageCropper.getByRole("button", { name: "Apply crop" }).click();
  await expect(
    page.locator("[data-sonner-toast]").getByText("Crop applied")
  ).toBeVisible();
  await expect(imageCropper).toBeHidden();

  await firstTile.getByRole("button", { name: "Preview media 1" }).click();
  const previewDialog = page.getByRole("dialog", {
    name: "Workflow preview image",
  });
  await expect(previewDialog).toBeVisible();
  await previewDialog.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Close details" }).click();
  const firstReorderButton = page.getByRole("button", {
    name: "Reorder media 1",
  });
  await firstReorderButton.focus();
  await firstReorderButton.press("ArrowRight");
  // Tiles render status and position, never the alt text, so confirm the move
  // through the preview dialog — it is labelled by the media's alt text.
  await page
    .locator("[data-media-tile]")
    .nth(1)
    .getByRole("button", { name: "Preview media 2" })
    .click();
  const movedDialog = page.getByRole("dialog", {
    name: "Workflow preview image",
  });
  await expect(movedDialog).toBeVisible();
  await movedDialog.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Remove media 6" }).click();
  await expect(page.locator("[data-media-tile]")).toHaveCount(5);
  await expect(page.locator("[data-media-add-tile]")).toBeVisible();

  await page.locator("form").getByRole("button", { name: "Published" }).click();
  await page.getByRole("button", { name: "Save changes" }).first().click();
  await expect(page.getByText("Changes saved")).toBeVisible();

  const savedActivity = await page.evaluate(async (apiUrl) => {
    const response = await fetch(
      `${apiUrl}/api/v1/activities/catatan-integrasi-publik-admin`,
      { credentials: "include" },
    );
    return response.json();
  }, API_URL);
  const croppedImage = savedActivity.assets.find(
    (item: { alt?: string }) => item.alt === "Workflow preview image",
  );
  const savedCover = savedActivity.assets.find(
    (item: { role?: string }) => item.role === "cover",
  );
  expect(croppedImage.src).toContain("/api/v1/assets/");
  expect(croppedImage.crop.aspectRatio).toBe(1);
  expect(croppedImage.crop.rotation).toBe(90);
  expect(savedCover.metadata.template).toBe("custom");

  await page.goto("/activities");
  await expect(page.getByText("Public admin integration note")).toBeVisible();
  const publicCard = page
    .locator("article")
    .filter({ hasText: "Public admin integration note" });
  await expect(
    publicCard.locator('[data-cover-template="custom"]')
  ).toBeVisible();
  await switchToIndonesian(page);
  await expect(page.getByText("Catatan integrasi publik admin")).toBeVisible();

  const publicContext = await browser.newContext({ baseURL });
  await publicContext.grantPermissions([
    "clipboard-read",
    "clipboard-write",
  ]);
  const publicPage = await publicContext.newPage();
  await publicPage.goto("/activities/catatan-integrasi-publik-admin");
  await expect(
    publicPage.getByRole("heading", { name: "Public admin integration note" })
  ).toBeVisible();
  await expect(
    publicPage.locator('[data-activity-cover][data-cover-template="custom"]')
  ).toBeVisible();
  await publicPage.getByRole("button", { name: "Copy link" }).click();
  await expect(
    publicPage.locator("[data-sonner-toast]").getByText("Link copied!")
  ).toBeVisible();
  await publicContext.close();

  const engagement = await page.evaluate(async (apiUrl) => {
    const options = {
      credentials: "include" as const,
      headers: { "Content-Type": "application/json" },
    };
    const like = await fetch(
      `${apiUrl}/api/v1/activities/catatan-integrasi-publik-admin/like`,
      {
        ...options,
        method: "PUT",
        body: JSON.stringify({ liked: true }),
      },
    );
    const comment = await fetch(
      `${apiUrl}/api/v1/activities/catatan-integrasi-publik-admin/comments`,
      {
        ...options,
        method: "POST",
        body: JSON.stringify({
          author: "E2E reviewer",
          body: "Persisted through PostgreSQL.",
        }),
      },
    );
    return {
      comment: await comment.json(),
      commentStatus: comment.status,
      like: await like.json(),
      likeStatus: like.status,
    };
  }, API_URL);
  expect(engagement.likeStatus).toBe(200);
  expect(engagement.like.liked).toBe(true);
  expect(engagement.commentStatus).toBe(201);
  expect(engagement.comment.body).toBe("Persisted through PostgreSQL.");

  await page.goto("/admin/activities");
  await page
    .locator("aside")
    .getByRole("button", { name: /Catatan integrasi publik admin/i })
    .click();
  await page.getByRole("button", { name: "Hapus aktivitas" }).click();
  const deleteDialog = page.getByRole("alertdialog");
  await deleteDialog.getByRole("button", { name: "Hapus aktivitas" }).click();
  await expect(page.getByText("Aktivitas dihapus")).toBeVisible();

  await page.goto("/activities");
  await expect(page.getByText("Catatan integrasi publik admin")).toHaveCount(0);
});

function tinyPng() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64"
  );
}

function transparentPng() {
  return sharp({
    create: {
      width: 16,
      height: 9,
      channels: 4,
      background: { r: 217, g: 255, b: 0, alpha: 0.35 },
    },
  })
    .png()
    .toBuffer();
}
