import { expect, test } from "@playwright/test";
import { loginAsAdmin, switchToIndonesian } from "./helpers";

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
  await upload.setInputFiles([
    {
      name: "workflow-image-1.png",
      mimeType: "image/png",
      buffer: tinyPng(),
    },
    {
      name: "workflow-video-1.mp4",
      mimeType: "video/mp4",
      buffer: Buffer.from("mock-video-content"),
    },
    {
      name: "workflow-image-2.png",
      mimeType: "image/png",
      buffer: tinyPng(),
    },
    {
      name: "workflow-image-3.png",
      mimeType: "image/png",
      buffer: tinyPng(),
    },
    {
      name: "workflow-video-2.mp4",
      mimeType: "video/mp4",
      buffer: Buffer.from("second-mock-video-content"),
    },
    {
      name: "workflow-image-4.png",
      mimeType: "image/png",
      buffer: tinyPng(),
    },
  ]);

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
  await expect(page.locator("[data-media-tile]").first()).toContainText("video");

  await page
    .locator("[data-media-tile]")
    .first()
    .getByRole("button", { name: "Edit" })
    .click();
  await page.getByLabel("Add video poster").setInputFiles({
    name: "video-poster.png",
    mimeType: "image/png",
    buffer: tinyPng(),
  });
  await expect(
    page.locator("[data-sonner-toast]").getByText("Video poster added")
  ).toBeVisible();

  await page.getByRole("button", { name: "Remove media 6" }).click();
  await expect(page.locator("[data-media-tile]")).toHaveCount(5);
  await expect(page.locator("[data-media-add-tile]")).toBeVisible();

  await page.locator("form").getByRole("button", { name: "Published" }).click();
  await page.getByRole("button", { name: "Save changes" }).first().click();
  await expect(page.getByText("Changes saved")).toBeVisible();

  await page.goto("/activities");
  await expect(page.getByText("Public admin integration note")).toBeVisible();
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
  await publicPage.getByRole("button", { name: "Copy link" }).click();
  await expect(
    publicPage.locator("[data-sonner-toast]").getByText("Link copied!")
  ).toBeVisible();
  await publicContext.close();

  await page.evaluate(() => {
    localStorage.setItem(
      "activity-likes",
      JSON.stringify({ "catatan-integrasi-publik-admin": true })
    );
    localStorage.setItem(
      "activity-comments",
      JSON.stringify({
        "catatan-integrasi-publik-admin": [
          {
            id: "local-cascade-check",
            author: "Test",
            body: "Should be removed with the post.",
            date: "2026-07-20",
          },
        ],
      })
    );
    localStorage.setItem(
      "activity-comments-hidden-v1",
      JSON.stringify(["local-cascade-check"])
    );
  });

  await page.goto("/admin/activities");
  await page
    .locator("aside")
    .getByRole("button", { name: /Catatan integrasi publik admin/i })
    .click();
  await page.getByRole("button", { name: "Hapus aktivitas" }).click();
  const deleteDialog = page.getByRole("alertdialog");
  await deleteDialog.getByRole("button", { name: "Hapus aktivitas" }).click();
  await expect(page.getByText("Aktivitas dihapus")).toBeVisible();

  const engagement = await page.evaluate(() => ({
    likes: JSON.parse(localStorage.getItem("activity-likes") ?? "{}"),
    comments: JSON.parse(localStorage.getItem("activity-comments") ?? "{}"),
    hidden: JSON.parse(
      localStorage.getItem("activity-comments-hidden-v1") ?? "[]"
    ),
  }));
  expect(engagement.likes["catatan-integrasi-publik-admin"]).toBeUndefined();
  expect(engagement.comments["catatan-integrasi-publik-admin"]).toBeUndefined();
  expect(engagement.hidden).not.toContain("local-cascade-check");

  await page.goto("/activities");
  await expect(page.getByText("Catatan integrasi publik admin")).toHaveCount(0);
});

function tinyPng() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64"
  );
}
