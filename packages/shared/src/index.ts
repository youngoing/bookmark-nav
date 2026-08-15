import { z } from "zod";
export * from "./result";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { readonly [key: string]: JsonValue };
export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() => z.union([
  z.string(), z.number(), z.boolean(), z.null(),
  z.array(jsonValueSchema), z.record(jsonValueSchema),
]));

export const bookmarkCreateInput = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  description: z.string().optional(),
  folderId: z.string().default("dev"),
  tags: z.array(z.string()).default([]),
  isPublic: z.boolean().default(false),
});
export type BookmarkCreateInput = z.infer<typeof bookmarkCreateInput>;
export const bookmarkPatchInput = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  folderId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
});
export const bookmarkResponse = bookmarkCreateInput.extend({
  title: z.string(),
  description: z.string(),
  folderId: z.string(),
  tags: z.array(z.string()),
  isPublic: z.boolean(),
  id: z.string(),
  domain: z.string(),
  favicon: z.string().url(),
  clicks: z.number().int().nonnegative(),
  createdAt: z.string(),
});
export type BookmarkResponse = z.infer<typeof bookmarkResponse>;
export const bookmarkPageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(9),
  folderId: z.string().optional(),
  tagId: z.string().optional(),
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

export const folderCreateInput = z.object({ name: z.string().trim().min(1).max(40), icon: z.string().trim().min(1).max(8).default("◈") });
export const folderUpdateInput = folderCreateInput.partial().refine((value) => value.name !== undefined || value.icon !== undefined, { message: "At least one folder field is required" });
export const folderResponse = folderCreateInput.extend({ id: z.string(), count: z.number().int().nonnegative(), createdAt: z.string(), updatedAt: z.string() });
export type FolderCreateInput = z.infer<typeof folderCreateInput>;
export type FolderUpdateInput = z.infer<typeof folderUpdateInput>;
export type Folder = z.infer<typeof folderResponse>;

export const tagCreateInput = z.object({ name: z.string().trim().min(1).max(30), color: z.string().regex(/^#[0-9a-fA-F]{6}$/) });
export const tagUpdateInput = tagCreateInput.partial().refine((value) => value.name !== undefined || value.color !== undefined, { message: "At least one tag field is required" });
export const tagResponse = tagCreateInput.extend({ id: z.string(), count: z.number().int().nonnegative(), createdAt: z.string(), updatedAt: z.string() });
export type TagCreateInput = z.infer<typeof tagCreateInput>;
export type TagUpdateInput = z.infer<typeof tagUpdateInput>;
export type Tag = z.infer<typeof tagResponse>;

export const userResponse = z.object({ id: z.string(), email: z.string().email(), name: z.string(), createdAt: z.string(), updatedAt: z.string() });
export const loginInput = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(8).max(128) });
export const loginResponse = z.object({ user: userResponse, token: z.string().min(1) });
export const sessionResponse = z.object({ user: userResponse });
export const accountUpdateInput = z.object({ name: z.string().trim().min(1).max(60).optional(), currentPassword: z.string().min(8).max(128).optional(), newPassword: z.string().min(8).max(128).optional() }).refine((value) => value.name !== undefined || value.newPassword !== undefined, { message: "At least one account field is required" });
export type UserResponse = z.infer<typeof userResponse>;
export type LoginInput = z.infer<typeof loginInput>;
export type AccountUpdateInput = z.infer<typeof accountUpdateInput>;

export type DashboardData = { bookmarks: BookmarkResponse[]; folders: Folder[]; tags: Tag[]; totalClicks: number };
export const dashboardResponse = z.object({
  bookmarks: z.array(bookmarkResponse),
  folders: z.array(folderResponse),
  tags: z.array(tagResponse),
  totalClicks: z.number().int().nonnegative(),
});

export const apiEnvelope = z.object({ ok: z.boolean(), requestId: z.string().optional() });
export const API_PATHS = { dashboard: "/api/v1/dashboard", bookmarks: "/api/v1/bookmarks", bookmarksPage: "/api/v1/bookmarks/page", folders: "/api/v1/folders", tags: "/api/v1/tags", account: "/api/v1/account", session: "/api/auth/session", login: "/api/auth/login", trpc: "/api/trpc" } as const;
