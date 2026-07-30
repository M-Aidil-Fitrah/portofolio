import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test("previews the live draft across public surfaces and responsive viewports", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await loginAsAdmin(page);
  await page.getByRole("button", { name: "New post" }).click();

  await page.getByLabel("Title").fill("Pratinjau draf langsung");
  await page
    .getByLabel("Short caption")
    .fill("Caption ini belum pernah disimpan.");
  await page
    .getByLabel("Full story")
    .fill("Detail draf ini tampil langsung di studio pratinjau.");
  await page
    .locator("form")
    .getByRole("button", { name: "English" })
    .click();
  await page.getByLabel("Title").fill("Live draft preview");
  await page
    .getByLabel("Short caption")
    .fill("This caption has not been saved.");
  await page
    .getByLabel("Full story")
    .fill("This live draft appears directly in the preview studio.");
  await page
    .locator("form")
    .getByRole("button", { name: "Indonesian" })
    .click();
  await page
    .locator('input[type="file"][accept="image/*,video/*"]')
    .setInputFiles({
      name: "live-preview.png",
      mimeType: "image/png",
      buffer: tinyPng(),
    });
  await expect(
    page.locator("[data-sonner-toast]").getByText("1 media files added")
  ).toBeVisible();

  const cvPdf = await readFile(
    path.join(
      process.cwd(),
      "public/assets/cv/CV Aidil (Indonesia).pdf"
    )
  );
  await page.getByLabel("Add documents").setInputFiles({
    name: "CV Aidil (Indonesia).pdf",
    mimeType: "application/pdf",
    buffer: cvPdf,
  });
  await expect(
    page.locator("[data-sonner-toast]").getByText("1 documents added")
  ).toBeVisible();

  await page
    .locator("form")
    .getByRole("button", { name: "Preview", exact: true })
    .last()
    .click();

  const studio = page.getByRole("dialog", { name: "Preview" });
  const frameElement = studio.locator("[data-preview-frame]");
  const frame = page.frameLocator("[data-preview-frame]");
  await expect(studio).toHaveAttribute("data-preview-tab", "feed");
  await expect(studio).toHaveAttribute("data-preview-viewport", "desktop");
  await expect(frameElement).toHaveAttribute("data-preview-width", "1440");
  await expect(frameElement).toHaveAttribute("data-preview-height", "1000");
  await expect(frame.locator("[data-preview-inert]")).toHaveAttribute(
    "inert",
    ""
  );
  await expect(frame.locator("[data-preview-feed]")).toContainText(
    "Pratinjau draf langsung"
  );
  await studio.getByRole("button", { name: "English" }).click();
  await expect(studio).toHaveAttribute("data-preview-locale", "en");
  await expect(frame.locator("[data-preview-feed]")).toContainText(
    "Live draft preview"
  );
  await studio.getByRole("button", { name: "Indonesian" }).click();
  await expect(studio).toHaveAttribute("data-preview-locale", "id");

  await studio.getByRole("tab", { name: "Detail" }).click();
  await expect(studio).toHaveAttribute("data-preview-tab", "detail");
  await expect(
    frame.locator('[data-activity-detail-preview="true"]')
  ).toContainText("Pratinjau draf langsung");

  await studio.getByRole("tab", { name: "Gallery (1)" }).click();
  await expect(studio).toHaveAttribute("data-preview-tab", "gallery");
  await expect(frame.locator("[data-preview-gallery]")).toBeVisible();
  await expect(
    frame.locator("[data-preview-gallery] [data-detail-media]")
  ).toHaveCount(1);

  await studio.getByRole("tab", { name: "Attachments (1)" }).click();
  await expect(studio).toHaveAttribute("data-preview-tab", "attachments");
  await expect(frame.locator("[data-public-attachments]")).toContainText(
    "CV Aidil (Indonesia)"
  );

  await studio.getByRole("button", { name: "Tablet" }).click();
  await expect(studio).toHaveAttribute("data-preview-viewport", "tablet");
  await expect(frameElement).toHaveAttribute("data-preview-width", "820");
  await expect(frameElement).toHaveAttribute("data-preview-height", "1180");
  await expect
    .poll(async () => (await frameElement.boundingBox())?.width)
    .toBe(820);

  await studio.getByRole("button", { name: "Mobile" }).click();
  await expect(studio).toHaveAttribute("data-preview-viewport", "mobile");
  await expect(frameElement).toHaveAttribute("data-preview-width", "390");
  await expect(frameElement).toHaveAttribute("data-preview-height", "844");
  await expect
    .poll(async () => (await frameElement.boundingBox())?.width)
    .toBe(390);

  await studio.getByRole("tab", { name: "Feed" }).click();
  await expect(frame.locator("[data-preview-feed]")).toContainText(
    "Pratinjau draf langsung"
  );
  const mobileColumns = await frame
    .locator(".activity-card")
    .evaluate((element) => getComputedStyle(element).gridTemplateColumns);
  expect(mobileColumns.trim().split(/\s+/)).toHaveLength(1);

  await studio.getByRole("button", { name: "Close preview" }).first().click();
  await expect(studio).toBeHidden();
});

function tinyPng() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64"
  );
}
