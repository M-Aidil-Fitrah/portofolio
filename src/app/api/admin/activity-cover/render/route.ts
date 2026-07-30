import { NextResponse } from "next/server";
import sharp from "sharp";
import { activityCoverTemplateSchema } from "@/lib/activity-schema";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { isSameOriginRequest } from "@/lib/admin-request-security";

export const runtime = "nodejs";

const WIDTH = 1600;
const HEIGHT = 900;
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_INPUT_PIXELS = 80_000_000;

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        source?: unknown;
        customOverlay?: unknown;
        template?: unknown;
        title?: unknown;
        category?: unknown;
        date?: unknown;
      }
    | null;
  const template = activityCoverTemplateSchema.safeParse(body?.template);
  const source = decodeImageDataUrl(body?.source);
  if (!template.success || !source) {
    return NextResponse.json({ error: "Invalid cover payload." }, { status: 400 });
  }

  try {
    const layers: sharp.OverlayOptions[] = [];
    if (
      template.data === "editorial" ||
      template.data === "project" ||
      template.data === "achievement"
    ) {
      layers.push({
        input: Buffer.from(
          templateSvg(
            template.data,
            cleanText(body?.title, 110),
            cleanText(body?.category, 36),
            cleanText(body?.date, 24)
          )
        ),
      });
    }

    if (template.data === "custom") {
      const overlay = decodeImageDataUrl(body?.customOverlay, ["image/png"]);
      if (!overlay) {
        return NextResponse.json(
          { error: "A transparent PNG overlay is required." },
          { status: 400 }
        );
      }
      const overlayImage = sharp(overlay.buffer, {
        limitInputPixels: MAX_INPUT_PIXELS,
      });
      const metadata = await overlayImage.metadata();
      if (metadata.format !== "png" || !metadata.hasAlpha) {
        return NextResponse.json(
          { error: "The custom overlay must be a transparent PNG." },
          { status: 400 }
        );
      }
      layers.push({
        input: await overlayImage
          .resize(WIDTH, HEIGHT, { fit: "fill" })
          .png()
          .toBuffer(),
      });
    }

    const output = await sharp(source.buffer, {
      limitInputPixels: MAX_INPUT_PIXELS,
      animated: false,
    })
      .rotate()
      .resize(WIDTH, HEIGHT, { fit: "cover", position: "centre" })
      .composite(layers)
      .webp({ lossless: true, effort: 4 })
      .toBuffer();

    return NextResponse.json({
      renderedSrc: `data:image/webp;base64,${output.toString("base64")}`,
      width: WIDTH,
      height: HEIGHT,
      lossless: true,
    });
  } catch {
    return NextResponse.json(
      { error: "The cover could not be rendered." },
      { status: 422 }
    );
  }
}

function decodeImageDataUrl(
  value: unknown,
  allowed = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
    "image/gif",
  ]
) {
  if (typeof value !== "string") return null;
  const match = /^data:([^;,]+);base64,([a-z0-9+/=\s]+)$/i.exec(value);
  if (!match || !allowed.includes(match[1].toLowerCase())) return null;
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) return null;
  return { mimeType: match[1].toLowerCase(), buffer };
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function templateSvg(
  template: "editorial" | "project" | "achievement",
  title: string,
  category: string,
  date: string
) {
  const safeTitle = escapeXml(title);
  const safeCategory = escapeXml(category.toUpperCase());
  const safeDate = escapeXml(date);
  const titleLines = wrapTitle(safeTitle)
    .map(
      (line, index) =>
        `<tspan x="${template === "achievement" ? 800 : 92}" dy="${
          index === 0 ? 0 : 86
        }">${line}</tspan>`
    )
    .join("");

  if (template === "editorial") {
    return `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="25%" stop-color="#050505" stop-opacity="0"/><stop offset="100%" stop-color="#050505" stop-opacity=".96"/></linearGradient></defs>
      <rect width="1600" height="900" fill="url(#shade)"/>
      <text x="92" y="94" fill="#d9ff00" font-family="monospace" font-size="22" letter-spacing="5">${safeCategory}</text>
      <text x="1508" y="94" text-anchor="end" fill="#fff" fill-opacity=".82" font-family="monospace" font-size="22" letter-spacing="4">${safeDate}</text>
      <text x="92" y="${720 - (wrapTitle(safeTitle).length - 1) * 86}" fill="#fff" font-family="Arial, sans-serif" font-size="78" font-weight="700" letter-spacing="-2">${titleLines}</text>
    </svg>`;
  }

  if (template === "project") {
    const grid = Array.from({ length: 9 }, (_, index) => {
      const x = index * 200;
      return `<line x1="${x}" y1="0" x2="${x}" y2="900"/><line x1="0" y1="${index * 112.5}" x2="1600" y2="${index * 112.5}"/>`;
    }).join("");
    return `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="1600" height="900" fill="#050505" fill-opacity=".48"/>
      <g stroke="#fff" stroke-opacity=".16" stroke-width="1">${grid}</g>
      <rect x="72" y="62" width="1456" height="776" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2"/>
      <text x="104" y="126" fill="#d9ff00" font-family="monospace" font-size="22" letter-spacing="5">${safeCategory} / ${safeDate}</text>
      <text x="104" y="${650 - (wrapTitle(safeTitle).length - 1) * 86}" fill="#fff" font-family="Arial, sans-serif" font-size="76" font-weight="700">${titleLines.replaceAll('x="92"', 'x="104"')}</text>
      <path d="M1380 730v70h100" fill="none" stroke="#d9ff00" stroke-width="4"/>
    </svg>`;
  }

  return `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="shade" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#050505" stop-opacity=".92"/><stop offset="100%" stop-color="#050505" stop-opacity=".24"/></linearGradient></defs>
    <rect width="1600" height="900" fill="url(#shade)"/>
    <rect x="72" y="62" width="1456" height="776" fill="none" stroke="#d9ff00" stroke-opacity=".8" stroke-width="2"/>
    <text x="800" y="300" text-anchor="middle" fill="#d9ff00" font-family="monospace" font-size="22" letter-spacing="6">${safeCategory} / ${safeDate}</text>
    <text x="800" y="${430 - (wrapTitle(safeTitle).length - 1) * 43}" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif" font-size="76" font-weight="700">${titleLines}</text>
    <path d="M72 170V62h108M1420 838h108V730" fill="none" stroke="#d9ff00" stroke-width="5"/>
  </svg>`;
}

function wrapTitle(value: string) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  for (const word of words) {
    const current = lines.at(-1);
    if (!current || current.length + word.length + 1 > 30) {
      if (lines.length === 3) break;
      lines.push(word);
    } else {
      lines[lines.length - 1] = `${current} ${word}`;
    }
  }
  return lines.length ? lines : ["UNTITLED ACTIVITY"];
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
