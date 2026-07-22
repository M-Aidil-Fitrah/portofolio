import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  activities as seedActivities,
  type ActivityPost,
} from "@/lib/activities";

interface StoredActivityState {
  version: 1;
  overrides: Record<string, ActivityPost>;
  deletedSlugs: string[];
}

const EMPTY_STATE: StoredActivityState = {
  version: 1,
  overrides: {},
  deletedSlugs: [],
};

const defaultStorePath = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  ".data",
  "activity-store.json"
);
const storePath =
  process.env.ACTIVITY_STORE_PATH ?? defaultStorePath;

function clonePost(post: ActivityPost): ActivityPost {
  return JSON.parse(JSON.stringify(post)) as ActivityPost;
}

function parseState(raw: string): StoredActivityState {
  const parsed = JSON.parse(raw) as Partial<StoredActivityState>;
  if (
    parsed.version !== 1 ||
    !parsed.overrides ||
    typeof parsed.overrides !== "object"
  ) {
    return EMPTY_STATE;
  }

  return {
    version: 1,
    overrides: parsed.overrides,
    deletedSlugs: Array.isArray(parsed.deletedSlugs)
      ? parsed.deletedSlugs.filter(
          (slug): slug is string => typeof slug === "string"
        )
      : [],
  };
}

async function readState(): Promise<StoredActivityState> {
  try {
    return parseState(
      await readFile(/* turbopackIgnore: true */ storePath, "utf8")
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return EMPTY_STATE;
    throw error;
  }
}

async function writeState(state: StoredActivityState) {
  await mkdir(/* turbopackIgnore: true */ path.dirname(storePath), {
    recursive: true,
  });
  await writeFile(
    /* turbopackIgnore: true */ storePath,
    `${JSON.stringify(state, null, 2)}\n`,
    "utf8"
  );
}

function mergePosts(state: StoredActivityState) {
  const deleted = new Set(state.deletedSlugs);
  const merged = new Map<string, ActivityPost>(
    seedActivities
      .filter((post) => !deleted.has(post.slug))
      .map((post) => [post.slug, clonePost(post)])
  );

  Object.values(state.overrides).forEach((post) => {
    if (!deleted.has(post.slug)) merged.set(post.slug, clonePost(post));
  });

  return Array.from(merged.values());
}

export function sortActivities(posts: ActivityPost[]) {
  return [...posts].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
    return b.date.localeCompare(a.date);
  });
}

export async function getPersistedActivities() {
  return mergePosts(await readState());
}

export async function getPersistedPublishedActivities() {
  return sortActivities(
    (await getPersistedActivities()).filter((post) => post.status === "published")
  );
}

export async function getPersistedActivity(slug: string) {
  return (await getPersistedActivities()).find((post) => post.slug === slug);
}

export async function savePersistedActivity(
  post: ActivityPost,
  currentSlug?: string
) {
  const state = await readState();
  const overrides = { ...state.overrides };
  const deletedSlugs = state.deletedSlugs.filter((slug) => slug !== post.slug);

  if (currentSlug && currentSlug !== post.slug) {
    delete overrides[currentSlug];
    deletedSlugs.push(currentSlug);
  }

  overrides[post.slug] = clonePost(post);
  await writeState({
    version: 1,
    overrides,
    deletedSlugs: Array.from(new Set(deletedSlugs)),
  });

  return getPersistedActivities();
}

export async function deletePersistedActivity(slug: string) {
  const state = await readState();
  const overrides = { ...state.overrides };
  delete overrides[slug];

  await writeState({
    version: 1,
    overrides,
    deletedSlugs: Array.from(new Set([...state.deletedSlugs, slug])),
  });

  return getPersistedActivities();
}
