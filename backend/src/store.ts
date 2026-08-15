import { randomUUID } from "node:crypto";
import type { Filter, Sort, WithId } from "mongodb";
import { failure, success, type BookmarkCreateInput, type BookmarkPageQuery, type BookmarkPageResponse, type BookmarkResponse, type DashboardData, type Folder, type FolderCreateInput, type FolderUpdateInput, type Result, type Tag, type TagCreateInput, type TagUpdateInput } from "@loomark/shared";
import { bookmarkDocumentSchema, getBookmarksCollection } from "./database/collections/bookmarks";
import { folderDocumentSchema, getFoldersCollection, type FolderDocument } from "./database/collections/folders";
import { getTagsCollection, tagDocumentSchema, type TagDocument } from "./database/collections/tags";

export type ManagementError = { code: "DUPLICATE_NAME" | "NOT_FOUND"; message: string };

function withoutFolderMongoId(document: WithId<FolderDocument>): FolderDocument {
  const { _id: _, ...value } = document;
  const parsed = folderDocumentSchema.safeParse(value);
  if (!parsed.success) throw new Error("MongoDB returned a folder with an invalid schema");
  return parsed.data;
}

function withoutTagMongoId(document: WithId<TagDocument>): TagDocument {
  const { _id: _, ...value } = document;
  const parsed = tagDocumentSchema.safeParse(value);
  if (!parsed.success) throw new Error("MongoDB returned a tag with an invalid schema");
  return parsed.data;
}

function withoutMongoId(bookmark: WithId<BookmarkResponse>): BookmarkResponse {
  const { _id: _, ...value } = bookmark;
  const parsed = bookmarkDocumentSchema.safeParse(value);
  if (!parsed.success) throw new Error("MongoDB returned a bookmark with an invalid schema");
  return parsed.data;
}

export async function listBookmarks(): Promise<BookmarkResponse[]> {
  const bookmarks = await getBookmarksCollection();
  return (await bookmarks.find({}).sort({ createdAt: -1 }).toArray()).map(withoutMongoId);
}

export async function listBookmarksPage(options: BookmarkPageQuery): Promise<BookmarkPageResponse> {
  const filter: Filter<BookmarkResponse> = {};
  if (options.folderId && options.folderId !== "all") filter.folderId = options.folderId;
  if (options.tagId) filter.tags = options.tagId;
  if (options.q) {
    filter.$or = [
      { title: { $regex: options.q, $options: "i" } },
      { domain: { $regex: options.q, $options: "i" } },
      { description: { $regex: options.q, $options: "i" } },
    ];
  }
  const sort: Sort = options.sort === "clicks" ? { clicks: -1 } : options.sort === "az" ? { title: 1 } : { createdAt: -1 };
  const bookmarks = await getBookmarksCollection();
  const total = await bookmarks.countDocuments(filter);
  const totalPages = total === 0 ? 0 : Math.ceil(total / options.pageSize);
  const page = totalPages === 0 ? 1 : Math.min(options.page, totalPages);
  const items = (await bookmarks.find(filter).sort(sort).skip((page - 1) * options.pageSize).limit(options.pageSize).toArray()).map(withoutMongoId);
  return { items, page, pageSize: options.pageSize, total, totalPages };
}

export async function getDashboard(): Promise<DashboardData> {
  const [bookmarks, folderDocuments, tagDocuments] = await Promise.all([listBookmarks(), (await getFoldersCollection()).find({}).sort({ createdAt: 1 }).toArray(), (await getTagsCollection()).find({}).sort({ createdAt: 1 }).toArray()]);
  const folders: Folder[] = folderDocuments.map((document) => {
    const folder = withoutFolderMongoId(document);
    return { ...folder, count: bookmarks.filter((item) => item.folderId === folder.id).length };
  });
  const tags: Tag[] = tagDocuments.map((document) => {
    const tag = withoutTagMongoId(document);
    return { ...tag, count: bookmarks.filter((item) => item.tags.includes(tag.id)).length };
  });
  const now = new Date().toISOString();
  return {
    bookmarks,
    folders: [{ id: "all", name: "全部书签", icon: "◈", count: bookmarks.length, createdAt: now, updatedAt: now }, ...folders],
    tags,
    totalClicks: bookmarks.reduce((sum, item) => sum + item.clicks, 0),
  };
}

export async function createFolder(input: FolderCreateInput): Promise<Result<Folder, ManagementError>> {
  const folders = await getFoldersCollection();
  if (await folders.countDocuments({ name: input.name }) > 0) return failure({ code: "DUPLICATE_NAME", message: "已存在同名目录" });
  const now = new Date().toISOString();
  const document = { id: randomUUID(), name: input.name, icon: input.icon, createdAt: now, updatedAt: now };
  await folders.insertOne(document);
  return success({ ...document, count: 0 });
}

export async function updateFolder(id: string, input: FolderUpdateInput): Promise<Result<Folder, ManagementError>> {
  const folders = await getFoldersCollection();
  const current = await folders.findOne({ id });
  if (!current) return failure({ code: "NOT_FOUND", message: "目录不存在" });
  if (input.name && input.name !== current.name && await folders.countDocuments({ name: input.name }) > 0) return failure({ code: "DUPLICATE_NAME", message: "已存在同名目录" });
  const updatedAt = new Date().toISOString();
  const updated = { ...current, name: input.name || current.name, icon: input.icon || current.icon, updatedAt };
  await folders.updateOne({ id }, { $set: { name: updated.name, icon: updated.icon, updatedAt } });
  const count = await (await getBookmarksCollection()).countDocuments({ folderId: id });
  return success({ id, name: updated.name, icon: updated.icon, createdAt: current.createdAt, updatedAt, count });
}

export async function createTag(input: TagCreateInput): Promise<Result<Tag, ManagementError>> {
  const tags = await getTagsCollection();
  if (await tags.countDocuments({ name: input.name }) > 0) return failure({ code: "DUPLICATE_NAME", message: "已存在同名标签" });
  const now = new Date().toISOString();
  const document = { id: randomUUID(), name: input.name, color: input.color, createdAt: now, updatedAt: now };
  await tags.insertOne(document);
  return success({ ...document, count: 0 });
}

export async function updateTag(id: string, input: TagUpdateInput): Promise<Result<Tag, ManagementError>> {
  const tags = await getTagsCollection();
  const current = await tags.findOne({ id });
  if (!current) return failure({ code: "NOT_FOUND", message: "标签不存在" });
  if (input.name && input.name !== current.name && await tags.countDocuments({ name: input.name }) > 0) return failure({ code: "DUPLICATE_NAME", message: "已存在同名标签" });
  const updatedAt = new Date().toISOString();
  const updated = { name: input.name || current.name, color: input.color || current.color };
  await tags.updateOne({ id }, { $set: { ...updated, updatedAt } });
  const count = await (await getBookmarksCollection()).countDocuments({ tags: id });
  return success({ id, ...updated, createdAt: current.createdAt, updatedAt, count });
}

export async function removeTag(id: string): Promise<Result<Tag, ManagementError>> {
  const tags = await getTagsCollection();
  const current = await tags.findOne({ id });
  if (!current) return failure({ code: "NOT_FOUND", message: "标签不存在" });
  await (await getBookmarksCollection()).updateMany({ tags: id }, { $pull: { tags: id } });
  await tags.deleteOne({ id });
  return success({ ...withoutTagMongoId(current), count: 0 });
}

export async function createBookmark(input: BookmarkCreateInput): Promise<BookmarkResponse> {
  const url = new URL(input.url);
  const item: BookmarkResponse = { ...input, id: randomUUID(), title: input.title || url.hostname, description: input.description || "", domain: url.hostname.replace(/^www\./, ""), favicon: `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`, clicks: 0, createdAt: new Date().toISOString(), isPublic: input.isPublic };
  await (await getBookmarksCollection()).insertOne(item);
  return item;
}

export async function clickBookmark(id: string): Promise<BookmarkResponse | undefined> {
  const bookmarks = await getBookmarksCollection();
  await bookmarks.updateOne({ id }, { $inc: { clicks: 1 } });
  const item = await bookmarks.findOne({ id });
  return item ? withoutMongoId(item) : undefined;
}

export async function updateBookmark(id: string, patch: Partial<BookmarkResponse>): Promise<BookmarkResponse | undefined> {
  const bookmarks = await getBookmarksCollection();
  await bookmarks.updateOne({ id }, { $set: patch });
  const item = await bookmarks.findOne({ id });
  return item ? withoutMongoId(item) : undefined;
}

export async function removeBookmark(id: string): Promise<boolean> {
  const result = await (await getBookmarksCollection()).deleteOne({ id });
  return result.deletedCount === 1;
}
