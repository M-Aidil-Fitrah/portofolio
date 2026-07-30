import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("portfolio-preloader-shown", "1");
  });
});

test("renders PDF previews with local assets, recovery, zoom, and fullscreen", async ({
  page,
}) => {
  const externalPdfRequests: string[] = [];
  let workerRequested = false;
  let failPdfOnce = true;

  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/pdfjs/pdf.worker.min.mjs") workerRequested = true;
    if (
      request.url().includes("unpkg.com") ||
      request.url().includes("cdnjs.cloudflare.com")
    ) {
      externalPdfRequests.push(request.url());
    }
  });
  await page.route(/CV%20Aidil%20\(Inggris\)\.pdf/, async (route) => {
    if (failPdfOnce) {
      failPdfOnce = false;
      await route.abort();
      return;
    }
    await route.continue();
  });

  await page.goto("/");
  await page.getByRole("button", { name: "View CV" }).click();

  const dialog = page.getByRole("dialog", { name: "CV Aidil — English" });
  const viewer = dialog.locator("[data-pdf-viewer]");
  await expect(viewer).toBeVisible();
  await expect(viewer).toHaveAttribute("data-pdf-local-assets", "true");
  await expect(
    viewer.getByRole("button", { name: "Retry PDF" })
  ).toBeVisible();

  await viewer.getByRole("button", { name: "Retry PDF" }).click();
  await expect(viewer.getByText("2 pages")).toBeVisible();
  await expect(viewer.locator("[data-pdf-page]")).toHaveCount(2);
  await expect(viewer.locator("canvas").first()).toBeVisible();
  expect(workerRequested).toBe(true);
  expect(externalPdfRequests).toEqual([]);

  const standardFont = await page.request.get(
    "/pdfjs/standard_fonts/LiberationSans-Regular.ttf"
  );
  expect(standardFont.ok()).toBe(true);

  await viewer.getByRole("button", { name: "Zoom in PDF" }).click();
  await expect(viewer).toHaveAttribute("data-pdf-zoom", "1.25");
  await viewer.getByRole("button", { name: "Reset PDF zoom" }).click();
  await expect(viewer).toHaveAttribute("data-pdf-zoom", "1.00");

  await viewer
    .getByRole("button", { name: "View PDF fullscreen" })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.fullscreenElement?.hasAttribute("data-pdf-viewer") ?? false
      )
    )
    .toBe(true);
  await viewer
    .getByRole("button", { name: "Exit PDF fullscreen" })
    .click();

  await page.setViewportSize({ width: 390, height: 844 });
  const viewerBox = await viewer.boundingBox();
  expect(viewerBox?.width ?? 999).toBeLessThanOrEqual(390);
  await expect(viewer.locator("[data-pdf-page]").first()).toBeVisible();

  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
});
