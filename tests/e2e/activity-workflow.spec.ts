import { expect, test } from "@playwright/test";
import { loginAsAdmin, switchToIndonesian } from "./helpers";

test("guards and recovers unsaved drafts", async ({ page }) => {
  await loginAsAdmin(page);

  const title = page.getByLabel("Title");
  await title.fill("Draf pemulihan otomatis");
  await page.waitForTimeout(500);
  page.once("dialog", (dialog) => dialog.accept());
  await page.reload();

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

test("creates rich media, publishes, syncs publicly, and deletes", async ({ page }) => {
  await loginAsAdmin(page);
  await page.getByRole("button", { name: "New post" }).click();

  await page.getByLabel("Title").fill("Catatan integrasi publik admin");
  await page.getByLabel("Short caption").fill("Caption Indonesia untuk pengujian.");
  await page.getByLabel("Full story").fill("Cerita lengkap Indonesia untuk pengujian alur.");

  await page.locator("form").getByRole("button", { name: "English" }).click();
  await page.getByLabel("Title").fill("Public admin integration note");
  await page.getByLabel("Short caption").fill("English caption for the workflow test.");
  await page.getByLabel("Full story").fill("Complete English story for the workflow test.");

  const upload = page.locator('input[type="file"][accept="image/*,video/*"]');
  await upload.setInputFiles([
    {
      name: "workflow-image.png",
      mimeType: "image/png",
      buffer: tinyPng(),
    },
    {
      name: "workflow-video.mp4",
      mimeType: "video/mp4",
      buffer: Buffer.from("mock-video-content"),
    },
  ]);

  await expect(page.getByLabel("Alternative text")).toHaveCount(2);
  await page.getByLabel("Alternative text").first().fill("Workflow preview image");
  await page.getByLabel("Caption (Indonesian)").first().fill("Caption media Indonesia");
  await page.getByLabel("Caption (English)").first().fill("English media caption");
  await page.getByLabel("Add video poster").setInputFiles({
    name: "video-poster.png",
    mimeType: "image/png",
    buffer: tinyPng(),
  });
  await page.getByRole("button", { name: "Move media later" }).first().click();

  await page.locator("form").getByRole("button", { name: "Published" }).click();
  await page.getByRole("button", { name: "Save changes" }).first().click();
  await expect(page.getByText("Changes saved")).toBeVisible();

  await page.goto("/activities");
  await expect(page.getByText("Public admin integration note")).toBeVisible();
  await switchToIndonesian(page);
  await expect(page.getByText("Catatan integrasi publik admin")).toBeVisible();

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
