import { readFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect, type FullConfig } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "./helpers";

const API_URL = "http://localhost:58080";

export default async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch({
    channel: process.env.CI ? undefined : "chrome",
  });
  const context = await browser.newContext({
    baseURL: config.projects[0]?.use.baseURL?.toString(),
  });
  const page = await context.newPage();

  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/activities$/);

  const fixtures = [
    {
      slug: "portfolio-motion-system",
      title: {
        en: "Building this portfolio's motion system",
        id: "Membangun sistem motion portofolio ini",
      },
      caption: {
        en: "A restrained motion system for the public portfolio.",
        id: "Sistem motion yang tertata untuk portofolio publik.",
      },
      body: {
        en: "A production-backed activity used to verify the public feed.",
        id: "Aktivitas berbasis database untuk memverifikasi feed publik.",
      },
      pinned: true,
      tags: ["Next.js", "Motion", "Design"],
    },
    {
      slug: "go-activity-backend",
      title: {
        en: "Shipping the Go activity backend",
        id: "Merilis backend aktivitas Go",
      },
      caption: {
        en: "Gin, PostgreSQL, and generated contracts working together.",
        id: "Gin, PostgreSQL, dan kontrak terbuat otomatis bekerja bersama.",
      },
      body: {
        en: "The activity studio now persists through the Go API.",
        id: "Activity studio kini tersimpan melalui Go API.",
      },
      pinned: false,
      tags: ["Go", "PostgreSQL"],
    },
    {
      slug: "typed-frontend-contract",
      title: {
        en: "Connecting a type-safe frontend contract",
        id: "Menghubungkan kontrak frontend type-safe",
      },
      caption: {
        en: "OpenAPI, Orval, and Zod keep both sides aligned.",
        id: "OpenAPI, Orval, dan Zod menjaga kedua sisi tetap selaras.",
      },
      body: {
        en: "Generated clients replace legacy persistence paths.",
        id: "Client terbuat otomatis menggantikan jalur persistensi lama.",
      },
      pinned: false,
      tags: ["OpenAPI", "Zod"],
    },
  ];

  for (const fixture of fixtures) {
    const response = await page.evaluate(
      async ({ apiUrl, activity }) => {
        const result = await fetch(`${apiUrl}/api/v1/admin/activities`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...activity,
            category: "project",
            date: "2026-07-31",
            assets: [],
            status: "published",
            progress: "shipped",
            related_project: null,
          }),
        });
        return { body: await result.text(), status: result.status };
      },
      { apiUrl: API_URL, activity: fixture },
    );
    if (response.status !== 201) {
      throw new Error(
        `Unable to seed ${fixture.slug}: ${response.status} ${response.body}`,
      );
    }
  }

  const tinyPng =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  const pdf = await readFile(
    path.join(process.cwd(), "public/assets/cv/CV Aidil (Inggris).pdf"),
  );
  const uploadedAssets = await page.evaluate(
    async ({ apiUrl, imageBase64, pdfBase64 }) => {
      async function upload(
        kind: "image" | "document",
        filename: string,
        mimeType: string,
        base64: string,
      ) {
        const bytes = Uint8Array.from(atob(base64), (value) =>
          value.charCodeAt(0),
        );
        const presign = await fetch(
          `${apiUrl}/api/v1/admin/assets/uploads`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kind,
              filename,
              mime_type: mimeType,
              byte_size: bytes.byteLength,
            }),
          },
        );
        if (!presign.ok) {
          throw new Error(`Presign failed: ${presign.status}`);
        }
        const value = await presign.json();
        const objectUpload = await fetch(value.upload_url, {
          method: "PUT",
          headers: { "Content-Type": mimeType },
          body: bytes,
        });
        if (!objectUpload.ok) {
          throw new Error(`Object upload failed: ${objectUpload.status}`);
        }
        let assetResponse = await fetch(
          `${apiUrl}/api/v1/admin/assets/${value.asset.id}/complete`,
          { method: "POST", credentials: "include" },
        );
        let asset = await assetResponse.json();
        const deadline = Date.now() + 120_000;
        while (asset.status === "queued" || asset.status === "processing") {
          if (Date.now() > deadline) {
            throw new Error(`Processing ${filename} timed out`);
          }
          await new Promise((resolve) => setTimeout(resolve, 500));
          assetResponse = await fetch(
            `${apiUrl}/api/v1/admin/assets/${asset.id}`,
            { credentials: "include" },
          );
          asset = await assetResponse.json();
        }
        if (asset.status !== "ready") {
          throw new Error(
            `Processing ${filename} failed: ${asset.error_message ?? "unknown"}`,
          );
        }
        return asset;
      }

      return Promise.all([
        upload("image", "detail-cover.png", "image/png", imageBase64),
        ...Array.from({ length: 5 }, (_, index) =>
          upload(
            "image",
            `detail-gallery-${index + 1}.png`,
            "image/png",
            imageBase64,
          ),
        ),
        upload(
          "document",
          "CV Aidil (Inggris).pdf",
          "application/pdf",
          pdfBase64,
        ),
      ]);
    },
    {
      apiUrl: API_URL,
      imageBase64: tinyPng,
      pdfBase64: pdf.toString("base64"),
    },
  );
  const [cover, ...rest] = uploadedAssets;
  const document = rest.pop();
  const detailResponse = await page.evaluate(
    async ({ apiUrl, coverId, gallery, documentId }) => {
      const response = await fetch(`${apiUrl}/api/v1/admin/activities`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
            en: "The story stays separate from gallery and attachments.",
            id: "Cerita tetap terpisah dari galeri dan lampiran.",
          },
          category: "project",
          date: "2026-07-30",
          tags: ["Gallery", "PDF"],
          assets: [
            {
              asset_id: coverId,
              role: "cover",
              position: 0,
              alt: "Fixture activity cover",
              caption: { en: "", id: "" },
              label: { en: "", id: "" },
              crop: null,
              metadata: { template: "none" },
            },
            ...gallery.map((assetId, position) => ({
              asset_id: assetId,
              role: "gallery",
              position,
              alt: `Fixture media ${position + 1}`,
              caption: {
                en: `Gallery caption ${position + 1}`,
                id: `Caption galeri ${position + 1}`,
              },
              label: { en: "", id: "" },
              crop: null,
              metadata: {},
            })),
            {
              asset_id: documentId,
              role: "attachment",
              position: 0,
              alt: "",
              caption: { en: "", id: "" },
              label: {
                en: "CV Preview Fixture",
                id: "Fixture Pratinjau CV",
              },
              crop: null,
              metadata: {},
            },
          ],
          status: "published",
          pinned: false,
          progress: "shipped",
          related_project: null,
        }),
      });
      return { body: await response.text(), status: response.status };
    },
    {
      apiUrl: API_URL,
      coverId: cover.id,
      gallery: rest.map((asset) => asset.id),
      documentId: document?.id,
    },
  );
  if (detailResponse.status !== 201) {
    throw new Error(
      `Unable to seed detail activity: ${detailResponse.status} ${detailResponse.body}`,
    );
  }

  await browser.close();
}
