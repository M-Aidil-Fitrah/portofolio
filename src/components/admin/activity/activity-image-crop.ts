import type { Area, Point } from "react-easy-crop";
import type { ActivityCrop } from "@/lib/activities";
import { assetNeedsCredentials } from "@/lib/api/fetcher";

export interface ActivityCropResult {
  src: string;
  crop: ActivityCrop;
}

export function createActivityCropMetadata({
  position,
  area,
  zoom,
  rotation,
  aspectRatio,
}: {
  position: Point;
  area: Area;
  zoom: number;
  rotation: number;
  aspectRatio: number;
}): ActivityCrop {
  return {
    position: {
      x: finite(position.x),
      y: finite(position.y),
    },
    area: {
      x: percentage(area.x),
      y: percentage(area.y),
      width: positivePercentage(area.width),
      height: positivePercentage(area.height),
    },
    zoom: Math.max(0.01, finite(zoom, 1)),
    rotation: Math.max(-360, Math.min(360, finite(rotation))),
    aspectRatio: Math.max(0.01, finite(aspectRatio, 1)),
  };
}

export async function renderActivityCrop(
  source: string,
  cropPixels: Area,
  rotation: number
) {
  const image = await loadImage(source);
  const radians = degreesToRadians(rotation);
  const rotated = rotatedSize(image.naturalWidth, image.naturalHeight, radians);
  const sourceCanvas = document.createElement("canvas");
  const sourceContext = sourceCanvas.getContext("2d");

  if (!sourceContext) {
    throw new Error("Canvas rendering is unavailable.");
  }

  sourceCanvas.width = Math.max(1, Math.round(rotated.width));
  sourceCanvas.height = Math.max(1, Math.round(rotated.height));
  sourceContext.translate(sourceCanvas.width / 2, sourceCanvas.height / 2);
  sourceContext.rotate(radians);
  sourceContext.translate(-image.naturalWidth / 2, -image.naturalHeight / 2);
  sourceContext.drawImage(image, 0, 0);

  const output = document.createElement("canvas");
  const outputContext = output.getContext("2d");
  const width = Math.max(1, Math.round(cropPixels.width));
  const height = Math.max(1, Math.round(cropPixels.height));

  if (!outputContext) {
    throw new Error("Canvas rendering is unavailable.");
  }

  output.width = width;
  output.height = height;
  outputContext.drawImage(
    sourceCanvas,
    Math.round(cropPixels.x),
    Math.round(cropPixels.y),
    width,
    height,
    0,
    0,
    width,
    height
  );

  return output.toDataURL("image/png");
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = assetNeedsCredentials(source)
      ? "use-credentials"
      : "anonymous";
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The image could not be decoded."));
    image.src = source;
  });
}

function degreesToRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function rotatedSize(width: number, height: number, radians: number) {
  return {
    width:
      Math.abs(Math.cos(radians) * width) +
      Math.abs(Math.sin(radians) * height),
    height:
      Math.abs(Math.sin(radians) * width) +
      Math.abs(Math.cos(radians) * height),
  };
}

function finite(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function percentage(value: number) {
  return Math.max(0, Math.min(100, finite(value)));
}

function positivePercentage(value: number) {
  return Math.max(0.0001, percentage(value));
}
