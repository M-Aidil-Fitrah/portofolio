const STORAGE_KEY = "project-cover-rect";

interface StoredRect {
  slug: string;
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Records the clicked cover's on-screen rect so the destination project
 * page can animate its own cover in from that exact position/size — a
 * manual FLIP (First/Last/Invert/Play) that survives a route change. */
export function saveCoverRect(slug: string, el: HTMLElement | null) {
  if (!el || typeof window === "undefined") return;
  const rect = el.getBoundingClientRect();
  const data: StoredRect = {
    slug,
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function consumeCoverRect(slug: string): StoredRect | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  window.sessionStorage.removeItem(STORAGE_KEY);
  try {
    const data = JSON.parse(raw) as StoredRect;
    return data.slug === slug ? data : null;
  } catch {
    return null;
  }
}
