import type { Collection, Db, Document, IndexDescription } from "mongodb";
import { bookmarkResponse, type BookmarkResponse } from "@loomark/shared";
import { getDatabase } from "../../db";

export type BookmarkDocument = BookmarkResponse;
export const bookmarkDocumentSchema = bookmarkResponse.strict();
export const BOOKMARKS_COLLECTION_NAME = "bookmarks" as const;

export const BOOKMARKS_VALIDATOR: Document = {
  $jsonSchema: {
    bsonType: "object",
    required: ["id", "title", "url", "description", "domain", "favicon", "folderId", "tags", "clicks", "createdAt", "isPublic"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      id: { bsonType: "string" },
      title: { bsonType: "string" },
      url: { bsonType: "string", pattern: "^https?://" },
      description: { bsonType: "string" },
      domain: { bsonType: "string" },
      favicon: { bsonType: "string", pattern: "^https?://" },
      folderId: { bsonType: "string" },
      tags: { bsonType: "array", items: { bsonType: "string" } },
      clicks: { bsonType: "int", minimum: 0 },
      createdAt: { bsonType: "string" },
      isPublic: { bsonType: "bool" },
    },
  },
};

export const BOOKMARKS_INDEXES: readonly IndexDescription[] = [
  { key: { id: 1 }, name: "bookmarks_id_unique", unique: true },
  { key: { createdAt: -1 }, name: "bookmarks_created_at" },
  { key: { folderId: 1 }, name: "bookmarks_folder_id" },
];

export const SEED_BOOKMARKS: readonly BookmarkDocument[] = [
  { id: "linear", title: "Linear", url: "https://linear.app", description: "现代团队的项目管理工具，专为高效协作而生。", domain: "linear.app", favicon: "https://www.google.com/s2/favicons?domain=linear.app&sz=64", folderId: "dev", tags: ["product", "inspiration"], clicks: 238, createdAt: "2024-12-12", isPublic: true },
  { id: "github", title: "GitHub", url: "https://github.com", description: "全球最大的开源代码托管与协作平台。", domain: "github.com", favicon: "https://www.google.com/s2/favicons?domain=github.com&sz=64", folderId: "dev", tags: ["frontend"], clicks: 512, createdAt: "2024-12-08", isPublic: true },
  { id: "notion", title: "Notion", url: "https://notion.so", description: "一体化的工作空间，写作、规划与知识管理。", domain: "notion.so", favicon: "https://www.google.com/s2/favicons?domain=notion.so&sz=64", folderId: "dev", tags: ["product", "reading"], clicks: 187, createdAt: "2024-11-30", isPublic: false },
  { id: "figma", title: "Figma", url: "https://figma.com", description: "在浏览器中完成设计、原型和团队协作。", domain: "figma.com", favicon: "https://www.google.com/s2/favicons?domain=figma.com&sz=64", folderId: "design", tags: ["product", "inspiration"], clicks: 324, createdAt: "2024-11-24", isPublic: true },
  { id: "v0", title: "v0 by Vercel", url: "https://v0.dev", description: "用自然语言生成高质量界面与组件。", domain: "v0.dev", favicon: "https://www.google.com/s2/favicons?domain=v0.dev&sz=64", folderId: "dev", tags: ["ai", "frontend"], clicks: 156, createdAt: "2024-11-19", isPublic: true },
  { id: "are.na", title: "Are.na", url: "https://www.are.na", description: "收集和组织灵感，建立自己的视觉档案。", domain: "are.na", favicon: "https://www.google.com/s2/favicons?domain=www.are.na&sz=64", folderId: "design", tags: ["inspiration"], clicks: 98, createdAt: "2024-11-10", isPublic: true },
  { id: "readwise", title: "Readwise", url: "https://readwise.io", description: "让你的阅读笔记真正成为长期记忆。", domain: "readwise.io", favicon: "https://www.google.com/s2/favicons?domain=readwise.io&sz=64", folderId: "read", tags: ["reading", "ai"], clicks: 76, createdAt: "2024-10-29", isPublic: false },
  { id: "raycast", title: "Raycast", url: "https://raycast.com", description: "macOS 上更快、更高效的启动器。", domain: "raycast.com", favicon: "https://www.google.com/s2/favicons?domain=raycast.com&sz=64", folderId: "dev", tags: ["frontend"], clicks: 205, createdAt: "2024-10-21", isPublic: true },
  { id: "stripe", title: "Stripe", url: "https://stripe.com", description: "互联网经济的支付基础设施。", domain: "stripe.com", favicon: "https://www.google.com/s2/favicons?domain=stripe.com&sz=64", folderId: "life", tags: ["product"], clicks: 61, createdAt: "2024-10-15", isPublic: false },
];

export async function getBookmarksCollection(): Promise<Collection<BookmarkDocument>> {
  return (await getDatabase()).collection<BookmarkDocument>(BOOKMARKS_COLLECTION_NAME);
}

export function getBookmarksCollectionFromDatabase(database: Db): Collection<BookmarkDocument> {
  return database.collection<BookmarkDocument>(BOOKMARKS_COLLECTION_NAME);
}
