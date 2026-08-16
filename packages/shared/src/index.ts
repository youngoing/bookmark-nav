import { z } from "zod";
export * from "./result";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { readonly [key: string]: JsonValue };
export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ]),
);

export const bookmarkCreateInput = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  description: z.string().optional(),
  siteId: z.string().nullable().default(null),
  folderId: z.string().nullable().default(null),
  tags: z.array(z.string()).default([]),
});
export type BookmarkCreateInput = z.infer<typeof bookmarkCreateInput>;
export const bookmarkPatchInput = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  siteId: z.string().optional(),
  folderId: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  isFavorite: z.boolean().optional(),
});
export type BookmarkPatchInput = z.infer<typeof bookmarkPatchInput>;
export const bookmarkResponse = bookmarkCreateInput.extend({
  ownerId: z.string(),
  title: z.string(),
  description: z.string(),
  siteId: z.string(),
  folderId: z.string().nullable(),
  tags: z.array(z.string()),
  isFavorite: z.boolean(),
  publicationId: z.string().nullable(),
  id: z.string(),
  domain: z.string(),
  favicon: z.string().url(),
  clicks: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type BookmarkResponse = z.infer<typeof bookmarkResponse>;
export const bookmarkPageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(9),
  folderId: z.string().optional(),
  tagId: z.string().optional(),
  favorite: z.coerce.boolean().optional(),
  q: z.string().trim().max(200).optional(),
  sort: z.enum(["recent", "clicks", "az"]).default("recent"),
});
export type BookmarkPageQuery = z.infer<typeof bookmarkPageQuery>;
export const bookmarkPageResponse = z.object({
  items: z.array(bookmarkResponse),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});
export type BookmarkPageResponse = z.infer<typeof bookmarkPageResponse>;

export const folderCreateInput = z.object({
  name: z.string().trim().min(1).max(40),
  icon: z.string().trim().min(1).max(8).default("◈"),
});
export const folderUpdateInput = folderCreateInput
  .partial()
  .refine((value) => value.name !== undefined || value.icon !== undefined, {
    message: "At least one folder field is required",
  });
export const folderResponse = folderCreateInput.extend({
  id: z.string(),
  ownerId: z.string(),
  count: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type FolderCreateInput = z.infer<typeof folderCreateInput>;
export type FolderUpdateInput = z.infer<typeof folderUpdateInput>;
export type Folder = z.infer<typeof folderResponse>;

export const tagCreateInput = z.object({
  name: z.string().trim().min(1).max(30),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  parentId: z.string().nullable().default(null),
});
export const tagUpdateInput = tagCreateInput
  .partial()
  .refine(
    (value) =>
      value.name !== undefined ||
      value.color !== undefined ||
      value.parentId !== undefined,
    { message: "At least one tag field is required" },
  );
export const tagResponse = tagCreateInput.extend({
  id: z.string(),
  ownerId: z.string(),
  collectionId: z.string().nullable(),
  count: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TagCreateInput = z.infer<typeof tagCreateInput>;
export type TagUpdateInput = z.infer<typeof tagUpdateInput>;
export type Tag = z.infer<typeof tagResponse>;

export const userResponse = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const loginInput = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
});
export const loginResponse = z.object({
  user: userResponse,
  token: z.string().min(1),
});
export const sessionResponse = z.object({ user: userResponse });
export const accountUpdateInput = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    currentPassword: z.string().min(8).max(128).optional(),
    newPassword: z.string().min(8).max(128).optional(),
  })
  .refine(
    (value) => value.name !== undefined || value.newPassword !== undefined,
    { message: "At least one account field is required" },
  );
export type UserResponse = z.infer<typeof userResponse>;
export type LoginInput = z.infer<typeof loginInput>;
export type AccountUpdateInput = z.infer<typeof accountUpdateInput>;

export const apiKeyCreateInput = z.object({
  name: z.string().trim().min(1).max(60),
});
export const apiKeyResponse = z.object({
  id: z.string(),
  name: z.string(),
  prefix: z.string(),
  createdAt: z.string(),
  lastUsedAt: z.string().nullable(),
});
export const apiKeyListResponse = z.array(apiKeyResponse);
export const apiKeyCreatedResponse = apiKeyResponse.extend({
  key: z.string().min(1),
});
export type ApiKeyCreateInput = z.infer<typeof apiKeyCreateInput>;
export type ApiKeyResponse = z.infer<typeof apiKeyResponse>;
export type ApiKeyCreatedResponse = z.infer<typeof apiKeyCreatedResponse>;

export const siteCreateInput = z.object({
  name: z.string().trim().min(1).max(80),
  homepageUrl: z.string().url(),
  folderId: z.string().nullable().default(null),
  tags: z.array(z.string()).default([]),
});
export const siteUpdateInput = siteCreateInput
  .partial()
  .refine(
    (value) =>
      value.name !== undefined ||
      value.homepageUrl !== undefined ||
      value.folderId !== undefined ||
      value.tags !== undefined,
    { message: "At least one site field is required" },
  );
export const siteResponse = siteCreateInput.extend({
  id: z.string(),
  ownerId: z.string(),
  domain: z.string(),
  favicon: z.string().url(),
  count: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SiteCreateInput = z.infer<typeof siteCreateInput>;
export type SiteUpdateInput = z.infer<typeof siteUpdateInput>;
export type Site = z.infer<typeof siteResponse>;
export const publicationResponse = z.object({
  id: z.string(),
  sourceBookmarkId: z.string(),
  author: z.object({ id: z.string(), name: z.string() }),
  url: z.string().url(),
  title: z.string(),
  description: z.string(),
  domain: z.string(),
  favicon: z.string().url(),
  publishedAt: z.string(),
});
export type Publication = z.infer<typeof publicationResponse>;
export const publicationListResponse = z.array(publicationResponse);
export const sharedCollectionPublishInput = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).default(""),
  bookmarkIds: z.array(z.string()).min(1).max(100),
});
export type SharedCollectionPublishInput = z.infer<
  typeof sharedCollectionPublishInput
>;
export const sharedCollectionItemResponse = z.object({
  id: z.string(),
  sourceBookmarkId: z.string(),
  url: z.string().url(),
  title: z.string(),
  description: z.string(),
  domain: z.string(),
  favicon: z.string().url(),
  sortOrder: z.number().int().nonnegative(),
});
export const sharedCollectionResponse = z.object({
  id: z.string(),
  ownerId: z.string(),
  sourceTagId: z.string(),
  author: z.object({ id: z.string(), name: z.string() }),
  name: z.string(),
  description: z.string(),
  items: z.array(sharedCollectionItemResponse),
  publishedAt: z.string(),
  updatedAt: z.string(),
});
export type SharedCollection = z.infer<typeof sharedCollectionResponse>;
export const sharedCollectionListResponse = z.array(sharedCollectionResponse);

export type DashboardData = {
  bookmarks: BookmarkResponse[];
  folders: Folder[];
  tags: Tag[];
  sites: Site[];
  totalClicks: number;
};
export const dashboardResponse = z.object({
  bookmarks: z.array(bookmarkResponse),
  folders: z.array(folderResponse),
  tags: z.array(tagResponse),
  sites: z.array(siteResponse),
  totalClicks: z.number().int().nonnegative(),
});

export const apiEnvelope = z.object({
  ok: z.boolean(),
  requestId: z.string().optional(),
});
export const API_PATHS = {
  dashboard: "/api/v1/dashboard",
  bookmarks: "/api/v1/bookmarks",
  bookmarksPage: "/api/v1/bookmarks/page",
  discover: "/api/v1/discover",
  sharedCollections: "/api/v1/shared-collections",
  sites: "/api/v1/sites",
  folders: "/api/v1/folders",
  tags: "/api/v1/tags",
  account: "/api/v1/account",
  session: "/api/auth/session",
  login: "/api/auth/login",
  trpc: "/api/trpc",
} as const;
