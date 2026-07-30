import type { ActivityAttachment } from "@/lib/activity-schema";

export const MAX_ACTIVITY_DOCUMENT_BYTES = 50 * 1024 * 1024;

export const ACTIVITY_DOCUMENT_ACCEPT = [
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".odt",
  ".odp",
  ".ods",
  ".txt",
  ".md",
].join(",");

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  odt: "application/vnd.oasis.opendocument.text",
  odp: "application/vnd.oasis.opendocument.presentation",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  txt: "text/plain",
  md: "text/markdown",
};

export function activityDocumentExtension(filename: string) {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

export function activityDocumentFileIsValid(file: File) {
  const extension = activityDocumentExtension(file.name);
  return (
    extension in MIME_BY_EXTENSION &&
    file.size <= MAX_ACTIVITY_DOCUMENT_BYTES
  );
}

export function activityDocumentTypeLabel(filename: string) {
  const extension = activityDocumentExtension(filename);
  return extension ? extension.toUpperCase() : "FILE";
}

export function activityDocumentFromFile(file: File): ActivityAttachment {
  const extension = activityDocumentExtension(file.name);
  const objectUrl = URL.createObjectURL(file);
  const isPdf = extension === "pdf";
  const label = file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();

  return {
    id: crypto.randomUUID(),
    type: "document",
    filename: file.name,
    mimeType: file.type || MIME_BY_EXTENSION[extension],
    size: file.size,
    originalSrc: objectUrl,
    downloadSrc: objectUrl,
    previewSrc: isPdf ? objectUrl : undefined,
    status: "queued",
    label: {
      en: label,
      id: label,
    },
  };
}

export function releaseActivityDocument(attachment: ActivityAttachment) {
  const urls = new Set([
    attachment.originalSrc,
    attachment.downloadSrc,
    attachment.previewSrc,
    attachment.thumbnailSrc,
  ]);
  urls.forEach((url) => {
    if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
  });
}

export function formatActivityDocumentSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${kilobytes.toFixed(kilobytes >= 10 ? 0 : 1)} KB`;
  const megabytes = kilobytes / 1024;
  return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
}
