import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test("manages unlimited activity documents with the shared PDF preview", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.getByRole("button", { name: "New post" }).click();

  const documentInput = page.getByLabel("Add documents");
  await expect(documentInput).toHaveAttribute(
    "accept",
    ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.odp,.ods,.txt,.md"
  );
  const cvPdf = await readFile(
    path.join(
      process.cwd(),
      "public/assets/cv/CV Aidil (Inggris).pdf"
    )
  );
  await documentInput.setInputFiles([
    {
      name: "CV Aidil (Inggris).pdf",
      mimeType: "application/pdf",
      buffer: cvPdf,
    },
    {
      name: "activity-brief.docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: Buffer.from("mock-docx"),
    },
    {
      name: "activity-deck.pptx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      buffer: Buffer.from("mock-pptx"),
    },
    {
      name: "activity-budget.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from("mock-xlsx"),
    },
    {
      name: "activity-notes.odt",
      mimeType: "application/vnd.oasis.opendocument.text",
      buffer: Buffer.from("mock-odt"),
    },
    {
      name: "activity-readme.md",
      mimeType: "text/markdown",
      buffer: Buffer.from("# Activity notes"),
    },
  ]);

  await expect(
    page.locator("[data-sonner-toast]").getByText("6 documents added")
  ).toBeVisible();
  const section = page.locator("section[data-document-count]");
  await expect(section).toHaveAttribute("data-document-count", "6");
  await expect(page.locator("[data-document-tile]")).toHaveCount(6);
  await expect(page.locator("[data-document-add-tile]")).toHaveCount(1);
  await expect(page.locator("[data-document-add-tile]")).toBeVisible();
  await expect(
    page.locator("[data-document-tile]").first()
  ).toHaveAttribute("data-document-status", "ready");
  await expect(
    page.locator("[data-document-tile]").nth(1)
  ).toHaveAttribute("data-document-status", "processing");
  await expect(
    page.locator("[data-document-tile]").nth(1)
  ).toContainText("Preview conversion pending");
  await expect(
    page.locator("[data-document-tile]").getByRole("link", {
      name: "Download",
    })
  ).toHaveCount(6);

  await page
    .getByRole("button", { name: "Preview document 1" })
    .click();
  const previewDialog = page.getByRole("dialog", {
    name: "CV Aidil (Inggris)",
  });
  await expect(previewDialog.locator("[data-pdf-viewer]")).toBeVisible();
  await expect(previewDialog.locator("[data-pdf-page]")).toHaveCount(2);
  await previewDialog.getByRole("button", { name: "Close" }).click();

  const secondTile = page.locator("[data-document-tile]").nth(1);
  await secondTile.getByRole("button", { name: "Edit labels" }).click();
  await page
    .getByLabel("Document label (Indonesian)")
    .fill("Ringkasan aktivitas");
  await page
    .getByLabel("Document label (English)")
    .fill("Activity brief");
  await expect(
    page.getByText(
      "A PDF preview will become available after the Go backend converter is connected."
    )
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Reorder document 2" })
    .focus();
  await page
    .getByRole("button", { name: "Reorder document 2" })
    .press("ArrowLeft");
  await expect(page.locator("[data-document-tile]").first()).toContainText(
    "Activity brief"
  );

  await page.getByRole("button", { name: "Remove document 6" }).click();
  await expect(page.locator("[data-document-tile]")).toHaveCount(5);
  await expect(page.locator("[data-document-add-tile]")).toBeVisible();

  await documentInput.setInputFiles({
    name: "activity-archive.zip",
    mimeType: "application/zip",
    buffer: Buffer.from("unsupported"),
  });
  await expect(
    page
      .locator("[data-sonner-toast]")
      .getByText("1 unsupported or oversized documents were skipped")
  ).toBeVisible();
  await expect(section).toHaveAttribute("data-document-count", "5");
});
