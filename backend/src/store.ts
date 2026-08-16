import { randomUUID } from "node:crypto";
import type { Filter, Sort, WithId } from "mongodb";
import {
  failure,
  success,
  type BookmarkCreateInput,
  type BookmarkPageQuery,
  type BookmarkPageResponse,
  type BookmarkPatchInput,
  type BookmarkResponse,
  type DashboardData,
  type Folder,
  type FolderCreateInput,
  type FolderUpdateInput,
  type Publication,
  type Result,
  type Site,
  type SiteCreateInput,
  type SiteUpdateInput,
  type SharedCollection,
  type SharedCollectionPublishInput,
  type Tag,
  type TagCreateInput,
  type TagUpdateInput,
} from "@loomark/shared";
import {
  bookmarkDocumentSchema,
  getBookmarksCollection,
} from "./database/collections/bookmarks";
import {
  folderDocumentSchema,
  getFoldersCollection,
  type FolderDocument,
} from "./database/collections/folders";
import {
  getPublicationsCollection,
  publicationDocumentSchema,
  type PublicationDocument,
} from "./database/collections/publications";
import {
  getTagsCollection,
  tagDocumentSchema,
  type TagDocument,
} from "./database/collections/tags";
import {
  getSitesCollection,
  siteDocumentSchema,
  type SiteDocument,
} from "./database/collections/sites";
import {
  getSharedCollectionsCollection,
  sharedCollectionDocumentSchema,
  type SharedCollectionDocument,
} from "./database/collections/shared-collections";

export type ManagementError = {
  code:
    | "DUPLICATE_NAME"
    | "NOT_FOUND"
    | "INVALID_REFERENCE"
    | "TAG_HAS_CHILDREN"
    | "FOLDER_NOT_EMPTY"
    | "SITE_NOT_EMPTY";
  message: string;
};

function withoutFolderMongoId(
  document: WithId<FolderDocument>,
): FolderDocument {
  const { _id: _, ...value } = document;
  return folderDocumentSchema.parse(value);
}

function withoutTagMongoId(document: WithId<TagDocument>): TagDocument {
  const { _id: _, ...value } = document;
  return tagDocumentSchema.parse(value);
}

function withoutSiteMongoId(document: WithId<SiteDocument>): SiteDocument {
  const { _id: _, ...value } = document;
  return siteDocumentSchema.parse(value);
}

function withoutSharedCollectionMongoId(
  document: WithId<SharedCollectionDocument>,
): SharedCollectionDocument {
  const { _id: _, ...value } = document;
  return sharedCollectionDocumentSchema.parse(value);
}

function publicSharedCollection(
  document: SharedCollectionDocument,
): SharedCollection {
  return {
    id: document.id,
    ownerId: document.ownerId,
    sourceTagId: document.sourceTagId,
    author: { id: document.ownerId, name: document.authorName },
    name: document.name,
    description: document.description,
    items: document.items,
    publishedAt: document.publishedAt,
    updatedAt: document.updatedAt,
  };
}

function withoutBookmarkMongoId(
  document: WithId<BookmarkResponse>,
): BookmarkResponse {
  const { _id: _, ...value } = document;
  return bookmarkDocumentSchema.parse(value);
}

function withoutPublicationMongoId(
  document: WithId<PublicationDocument>,
): PublicationDocument {
  const { _id: _, ...value } = document;
  return publicationDocumentSchema.parse(value);
}

function publicPublication(document: PublicationDocument): Publication {
  return {
    id: document.id,
    sourceBookmarkId: document.sourceBookmarkId,
    author: { id: document.ownerId, name: document.authorName },
    url: document.url,
    title: document.title,
    description: document.description,
    domain: document.domain,
    favicon: document.favicon,
    publishedAt: document.publishedAt,
  };
}

async function referencesBelongToOwner(
  ownerId: string,
  folderId: string | null | undefined,
  tagIds: string[] | undefined,
): Promise<boolean> {
  if (folderId) {
    const folder = await (
      await getFoldersCollection()
    ).findOne({ id: folderId, ownerId });
    if (!folder) return false;
  }
  if (tagIds?.length) {
    const count = await (
      await getTagsCollection()
    ).countDocuments({ id: { $in: tagIds }, ownerId });
    if (count !== new Set(tagIds).size) return false;
  }
  return true;
}

export async function listBookmarks(
  ownerId: string,
): Promise<BookmarkResponse[]> {
  const documents = await (await getBookmarksCollection())
    .find({ ownerId })
    .sort({ createdAt: -1 })
    .toArray();
  return documents.map(withoutBookmarkMongoId);
}

export async function listBookmarksPage(
  ownerId: string,
  options: BookmarkPageQuery,
): Promise<BookmarkPageResponse> {
  const filter: Filter<BookmarkResponse> = { ownerId };
  const conditions: Filter<BookmarkResponse>[] = [];
  const sites = await getSitesCollection();
  if (options.folderId && options.folderId !== "all") {
    const siteIds = (
      await sites
        .find(
          { ownerId, folderId: options.folderId },
          { projection: { id: 1 } },
        )
        .toArray()
    ).map((site) => site.id);
    conditions.push({
      $or: [{ folderId: options.folderId }, { siteId: { $in: siteIds } }],
    });
  }
  if (options.tagId) {
    const siteIds = (
      await sites
        .find({ ownerId, tags: options.tagId }, { projection: { id: 1 } })
        .toArray()
    ).map((site) => site.id);
    conditions.push({
      $or: [{ tags: options.tagId }, { siteId: { $in: siteIds } }],
    });
  }
  if (options.favorite) filter.isFavorite = true;
  if (options.q) {
    conditions.push({
      $or: [
        { title: { $regex: options.q, $options: "i" } },
        { domain: { $regex: options.q, $options: "i" } },
        { description: { $regex: options.q, $options: "i" } },
      ],
    });
  }
  if (conditions.length) filter.$and = conditions;
  const sort: Sort =
    options.sort === "clicks"
      ? { clicks: -1 }
      : options.sort === "az"
        ? { title: 1 }
        : { createdAt: -1 };
  const bookmarks = await getBookmarksCollection();
  const total = await bookmarks.countDocuments(filter);
  const totalPages = total === 0 ? 0 : Math.ceil(total / options.pageSize);
  const page = totalPages === 0 ? 1 : Math.min(options.page, totalPages);
  const items = (
    await bookmarks
      .find(filter)
      .sort(sort)
      .skip((page - 1) * options.pageSize)
      .limit(options.pageSize)
      .toArray()
  ).map(withoutBookmarkMongoId);
  return { items, page, pageSize: options.pageSize, total, totalPages };
}

export async function getDashboard(ownerId: string): Promise<DashboardData> {
  const [bookmarks, folderDocuments, tagDocuments, siteDocuments] =
    await Promise.all([
      listBookmarks(ownerId),
      (await getFoldersCollection())
        .find({ ownerId })
        .sort({ createdAt: 1 })
        .toArray(),
      (await getTagsCollection())
        .find({ ownerId })
        .sort({ parentId: 1, createdAt: 1 })
        .toArray(),
      (await getSitesCollection())
        .find({ ownerId })
        .sort({ name: 1 })
        .toArray(),
    ]);
  const siteById = new Map(siteDocuments.map((site) => [site.id, site]));
  const folders: Folder[] = folderDocuments.map((document) => {
    const folder = withoutFolderMongoId(document);
    return {
      ...folder,
      count: bookmarks.filter(
        (item) =>
          item.folderId === folder.id ||
          siteById.get(item.siteId)?.folderId === folder.id,
      ).length,
    };
  });
  const tags: Tag[] = tagDocuments.map((document) => {
    const tag = withoutTagMongoId(document);
    return {
      ...tag,
      count: bookmarks.filter(
        (item) =>
          item.tags.includes(tag.id) ||
          siteById.get(item.siteId)?.tags.includes(tag.id),
      ).length,
    };
  });
  const sites: Site[] = siteDocuments.map((document) => {
    const site = withoutSiteMongoId(document);
    return {
      ...site,
      count: bookmarks.filter((bookmark) => bookmark.siteId === site.id).length,
    };
  });
  const now = new Date().toISOString();
  return {
    bookmarks,
    folders: [
      {
        id: "all",
        ownerId,
        name: "全部书签",
        icon: "◈",
        count: bookmarks.length,
        createdAt: now,
        updatedAt: now,
      },
      ...folders,
    ],
    tags,
    sites,
    totalClicks: bookmarks.reduce((sum, item) => sum + item.clicks, 0),
  };
}

export async function createFolder(
  ownerId: string,
  input: FolderCreateInput,
): Promise<Result<Folder, ManagementError>> {
  const folders = await getFoldersCollection();
  if ((await folders.countDocuments({ ownerId, name: input.name })) > 0)
    return failure({ code: "DUPLICATE_NAME", message: "已存在同名目录" });
  const now = new Date().toISOString();
  const document: FolderDocument = {
    id: randomUUID(),
    ownerId,
    name: input.name,
    icon: input.icon,
    createdAt: now,
    updatedAt: now,
  };
  await folders.insertOne(document);
  return success({ ...document, count: 0 });
}

export async function updateFolder(
  ownerId: string,
  id: string,
  input: FolderUpdateInput,
): Promise<Result<Folder, ManagementError>> {
  const folders = await getFoldersCollection();
  const current = await folders.findOne({ id, ownerId });
  if (!current) return failure({ code: "NOT_FOUND", message: "目录不存在" });
  if (
    input.name &&
    input.name !== current.name &&
    (await folders.countDocuments({ ownerId, name: input.name })) > 0
  )
    return failure({ code: "DUPLICATE_NAME", message: "已存在同名目录" });
  const updatedAt = new Date().toISOString();
  const updated = {
    name: input.name || current.name,
    icon: input.icon || current.icon,
  };
  await folders.updateOne({ id, ownerId }, { $set: { ...updated, updatedAt } });
  const count = await (
    await getBookmarksCollection()
  ).countDocuments({ ownerId, folderId: id });
  return success({
    id,
    ownerId,
    ...updated,
    createdAt: current.createdAt,
    updatedAt,
    count,
  });
}

export async function removeFolder(
  ownerId: string,
  id: string,
): Promise<Result<Folder, ManagementError>> {
  const folders = await getFoldersCollection();
  const current = await folders.findOne({ id, ownerId });
  if (!current) return failure({ code: "NOT_FOUND", message: "目录不存在" });
  const count = await (
    await getBookmarksCollection()
  ).countDocuments({ ownerId, folderId: id });
  if (count > 0)
    return failure({ code: "FOLDER_NOT_EMPTY", message: "目录中仍有书签" });
  await folders.deleteOne({ id, ownerId });
  return success({ ...withoutFolderMongoId(current), count: 0 });
}

export async function createTag(
  ownerId: string,
  input: TagCreateInput,
): Promise<Result<Tag, ManagementError>> {
  const tags = await getTagsCollection();
  if (input.parentId && !(await tags.findOne({ id: input.parentId, ownerId })))
    return failure({ code: "INVALID_REFERENCE", message: "父标签不存在" });
  if (
    (await tags.countDocuments({
      ownerId,
      parentId: input.parentId,
      name: input.name,
    })) > 0
  )
    return failure({ code: "DUPLICATE_NAME", message: "同级下已存在同名标签" });
  const now = new Date().toISOString();
  const document: TagDocument = {
    id: randomUUID(),
    ownerId,
    name: input.name,
    color: input.color,
    parentId: input.parentId,
    collectionId: null,
    createdAt: now,
    updatedAt: now,
  };
  await tags.insertOne(document);
  return success({ ...document, count: 0 });
}

export async function updateTag(
  ownerId: string,
  id: string,
  input: TagUpdateInput,
): Promise<Result<Tag, ManagementError>> {
  const tags = await getTagsCollection();
  const current = await tags.findOne({ id, ownerId });
  if (!current) return failure({ code: "NOT_FOUND", message: "标签不存在" });
  const parentId =
    input.parentId === undefined ? current.parentId : input.parentId;
  if (parentId === id)
    return failure({
      code: "INVALID_REFERENCE",
      message: "标签不能成为自己的子标签",
    });
  if (parentId && !(await tags.findOne({ id: parentId, ownerId })))
    return failure({ code: "INVALID_REFERENCE", message: "父标签不存在" });
  const name = input.name || current.name;
  if (
    (await tags.countDocuments({ ownerId, parentId, name, id: { $ne: id } })) >
    0
  )
    return failure({ code: "DUPLICATE_NAME", message: "同级下已存在同名标签" });
  const updatedAt = new Date().toISOString();
  const updated = { name, color: input.color || current.color, parentId };
  await tags.updateOne({ id, ownerId }, { $set: { ...updated, updatedAt } });
  const count = await (
    await getBookmarksCollection()
  ).countDocuments({ ownerId, tags: id });
  return success({
    id,
    ownerId,
    ...updated,
    collectionId: current.collectionId,
    createdAt: current.createdAt,
    updatedAt,
    count,
  });
}

export async function removeTag(
  ownerId: string,
  id: string,
): Promise<Result<Tag, ManagementError>> {
  const tags = await getTagsCollection();
  const current = await tags.findOne({ id, ownerId });
  if (!current) return failure({ code: "NOT_FOUND", message: "标签不存在" });
  if ((await tags.countDocuments({ ownerId, parentId: id })) > 0)
    return failure({
      code: "TAG_HAS_CHILDREN",
      message: "请先删除或移动子标签",
    });
  await (
    await getBookmarksCollection()
  ).updateMany({ ownerId, tags: id }, { $pull: { tags: id } });
  if (current.collectionId)
    await (
      await getSharedCollectionsCollection()
    ).deleteOne({ id: current.collectionId, ownerId });
  await tags.deleteOne({ id, ownerId });
  return success({ ...withoutTagMongoId(current), count: 0 });
}

export async function createSite(
  ownerId: string,
  input: SiteCreateInput,
): Promise<Result<Site, ManagementError>> {
  if (!(await referencesBelongToOwner(ownerId, input.folderId, input.tags)))
    return failure({
      code: "INVALID_REFERENCE",
      message: "目录或标签不属于当前用户",
    });
  const url = new URL(input.homepageUrl);
  const domain = url.hostname.replace(/^www\./, "");
  const sites = await getSitesCollection();
  if (await sites.findOne({ ownerId, domain }))
    return failure({ code: "DUPLICATE_NAME", message: "该域名的网站已存在" });
  const now = new Date().toISOString();
  const document: SiteDocument = {
    id: randomUUID(),
    ownerId,
    name: input.name,
    homepageUrl: input.homepageUrl,
    domain,
    favicon: `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`,
    folderId: input.folderId,
    tags: input.tags,
    createdAt: now,
    updatedAt: now,
  };
  await sites.insertOne(document);
  return success({ ...document, count: 0 });
}

export async function updateSite(
  ownerId: string,
  id: string,
  input: SiteUpdateInput,
): Promise<Result<Site, ManagementError>> {
  const sites = await getSitesCollection();
  const current = await sites.findOne({ id, ownerId });
  if (!current) return failure({ code: "NOT_FOUND", message: "网站不存在" });
  if (!(await referencesBelongToOwner(ownerId, input.folderId, input.tags)))
    return failure({
      code: "INVALID_REFERENCE",
      message: "目录或标签不属于当前用户",
    });
  const homepageUrl = input.homepageUrl || current.homepageUrl;
  const url = new URL(homepageUrl);
  const domain = url.hostname.replace(/^www\./, "");
  if (domain !== current.domain && (await sites.findOne({ ownerId, domain })))
    return failure({ code: "DUPLICATE_NAME", message: "该域名的网站已存在" });
  const updatedAt = new Date().toISOString();
  const updated = {
    name: input.name || current.name,
    homepageUrl,
    domain,
    favicon: `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`,
    folderId: input.folderId === undefined ? current.folderId : input.folderId,
    tags: input.tags || current.tags,
    updatedAt,
  };
  await sites.updateOne({ id, ownerId }, { $set: updated });
  const count = await (
    await getBookmarksCollection()
  ).countDocuments({ ownerId, siteId: id });
  return success({
    id,
    ownerId,
    ...updated,
    createdAt: current.createdAt,
    count,
  });
}

export async function removeSite(
  ownerId: string,
  id: string,
): Promise<Result<Site, ManagementError>> {
  const sites = await getSitesCollection();
  const current = await sites.findOne({ id, ownerId });
  if (!current) return failure({ code: "NOT_FOUND", message: "网站不存在" });
  const count = await (
    await getBookmarksCollection()
  ).countDocuments({ ownerId, siteId: id });
  if (count > 0)
    return failure({
      code: "SITE_NOT_EMPTY",
      message: "请先删除网站下的子链接",
    });
  await sites.deleteOne({ id, ownerId });
  return success({ ...withoutSiteMongoId(current), count: 0 });
}

export async function createBookmark(
  ownerId: string,
  input: BookmarkCreateInput,
): Promise<Result<BookmarkResponse, ManagementError>> {
  if (!(await referencesBelongToOwner(ownerId, input.folderId, input.tags)))
    return failure({
      code: "INVALID_REFERENCE",
      message: "目录或标签不属于当前用户",
    });
  const url = new URL(input.url);
  const domain = url.hostname.replace(/^www\./, "");
  const sites = await getSitesCollection();
  let site: SiteDocument | WithId<SiteDocument> | null = input.siteId
    ? await sites.findOne({ id: input.siteId, ownerId })
    : await sites.findOne({ ownerId, domain });
  if (input.siteId && !site)
    return failure({
      code: "INVALID_REFERENCE",
      message: "网站不属于当前用户",
    });
  if (!site) {
    const now = new Date().toISOString();
    const document: SiteDocument = {
      id: randomUUID(),
      ownerId,
      name: domain,
      homepageUrl: url.origin,
      domain,
      favicon: `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`,
      folderId: input.folderId,
      tags: [],
      createdAt: now,
      updatedAt: now,
    };
    await sites.insertOne(document);
    site = document;
  }
  const now = new Date().toISOString();
  const item: BookmarkResponse = {
    ...input,
    siteId: String(site.id),
    id: randomUUID(),
    ownerId,
    title: input.title || url.hostname,
    description: input.description || "",
    domain,
    favicon: `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`,
    clicks: 0,
    isFavorite: false,
    publicationId: null,
    createdAt: now,
    updatedAt: now,
  };
  await (await getBookmarksCollection()).insertOne(item);
  return success(item);
}

export async function clickBookmark(
  ownerId: string,
  id: string,
): Promise<BookmarkResponse | undefined> {
  const bookmarks = await getBookmarksCollection();
  const item = await bookmarks.findOneAndUpdate(
    { id, ownerId },
    { $inc: { clicks: 1 }, $set: { updatedAt: new Date().toISOString() } },
    { returnDocument: "after" },
  );
  return item ? withoutBookmarkMongoId(item) : undefined;
}

export async function updateBookmark(
  ownerId: string,
  id: string,
  patch: BookmarkPatchInput,
): Promise<Result<BookmarkResponse, ManagementError>> {
  if (!(await referencesBelongToOwner(ownerId, patch.folderId, patch.tags)))
    return failure({
      code: "INVALID_REFERENCE",
      message: "目录或标签不属于当前用户",
    });
  if (
    patch.siteId &&
    !(await (await getSitesCollection()).findOne({ id: patch.siteId, ownerId }))
  )
    return failure({
      code: "INVALID_REFERENCE",
      message: "网站不属于当前用户",
    });
  const bookmarks = await getBookmarksCollection();
  const item = await bookmarks.findOneAndUpdate(
    { id, ownerId },
    { $set: { ...patch, updatedAt: new Date().toISOString() } },
    { returnDocument: "after" },
  );
  return item
    ? success(withoutBookmarkMongoId(item))
    : failure({ code: "NOT_FOUND", message: "书签不存在" });
}

export async function removeBookmark(
  ownerId: string,
  id: string,
): Promise<boolean> {
  const bookmarks = await getBookmarksCollection();
  const current = await bookmarks.findOne({ id, ownerId });
  if (!current) return false;
  if (current.publicationId)
    await (
      await getPublicationsCollection()
    ).deleteOne({ id: current.publicationId, ownerId });
  const result = await bookmarks.deleteOne({ id, ownerId });
  return result.deletedCount === 1;
}

export async function publishBookmark(
  ownerId: string,
  authorName: string,
  id: string,
): Promise<Result<Publication, ManagementError>> {
  const bookmarks = await getBookmarksCollection();
  const bookmark = await bookmarks.findOne({ id, ownerId });
  if (!bookmark) return failure({ code: "NOT_FOUND", message: "书签不存在" });
  const publications = await getPublicationsCollection();
  if (bookmark.publicationId) {
    const existing = await publications.findOne({
      id: bookmark.publicationId,
      ownerId,
    });
    if (existing)
      return success(publicPublication(withoutPublicationMongoId(existing)));
  }
  const document: PublicationDocument = {
    id: randomUUID(),
    sourceBookmarkId: bookmark.id,
    ownerId,
    authorName,
    url: bookmark.url,
    title: bookmark.title,
    description: bookmark.description,
    domain: bookmark.domain,
    favicon: bookmark.favicon,
    publishedAt: new Date().toISOString(),
  };
  await publications.insertOne(document);
  await bookmarks.updateOne(
    { id, ownerId },
    {
      $set: { publicationId: document.id, updatedAt: new Date().toISOString() },
    },
  );
  return success(publicPublication(document));
}

export async function unpublishBookmark(
  ownerId: string,
  id: string,
): Promise<boolean> {
  const bookmarks = await getBookmarksCollection();
  const bookmark = await bookmarks.findOne({ id, ownerId });
  if (!bookmark?.publicationId) return false;
  await (
    await getPublicationsCollection()
  ).deleteOne({ id: bookmark.publicationId, ownerId });
  await bookmarks.updateOne(
    { id, ownerId },
    { $set: { publicationId: null, updatedAt: new Date().toISOString() } },
  );
  return true;
}

export async function listDiscover(ownerId: string): Promise<Publication[]> {
  const documents = await (
    await getPublicationsCollection()
  )
    .find({ ownerId: { $ne: ownerId } })
    .sort({ publishedAt: -1 })
    .limit(100)
    .toArray();
  return documents.map((document) =>
    publicPublication(withoutPublicationMongoId(document)),
  );
}

export async function savePublication(
  ownerId: string,
  publicationId: string,
): Promise<Result<BookmarkResponse, ManagementError>> {
  const publication = await (
    await getPublicationsCollection()
  ).findOne({ id: publicationId, ownerId: { $ne: ownerId } });
  if (!publication)
    return failure({ code: "NOT_FOUND", message: "分享不存在" });
  return createBookmark(ownerId, {
    url: publication.url,
    title: publication.title,
    description: publication.description,
    siteId: null,
    folderId: null,
    tags: [],
  });
}

export async function publishTagCollection(
  ownerId: string,
  authorName: string,
  tagId: string,
  input: SharedCollectionPublishInput,
): Promise<Result<SharedCollection, ManagementError>> {
  const tags = await getTagsCollection();
  const tag = await tags.findOne({ id: tagId, ownerId });
  if (!tag) return failure({ code: "NOT_FOUND", message: "标签不存在" });
  const inheritedSiteIds = (
    await (await getSitesCollection())
      .find({ ownerId, tags: tagId }, { projection: { id: 1 } })
      .toArray()
  ).map((site) => site.id);
  const eligible = await (await getBookmarksCollection())
    .find({
      ownerId,
      $or: [{ tags: tagId }, { siteId: { $in: inheritedSiteIds } }],
    })
    .toArray();
  const eligibleById = new Map(
    eligible.map((bookmark) => [bookmark.id, bookmark]),
  );
  const selectedIds = [...new Set(input.bookmarkIds)];
  if (selectedIds.some((id) => !eligibleById.has(id)))
    return failure({
      code: "INVALID_REFERENCE",
      message: "合集包含不属于该标签的书签",
    });
  const now = new Date().toISOString();
  const collections = await getSharedCollectionsCollection();
  const existing = tag.collectionId
    ? await collections.findOne({ id: tag.collectionId, ownerId })
    : await collections.findOne({ ownerId, sourceTagId: tagId });
  const document: SharedCollectionDocument = {
    id: existing?.id || randomUUID(),
    ownerId,
    sourceTagId: tagId,
    authorName,
    name: input.name,
    description: input.description,
    items: selectedIds.map((id, sortOrder) => {
      const bookmark = eligibleById.get(id)!;
      return {
        id: randomUUID(),
        sourceBookmarkId: bookmark.id,
        url: bookmark.url,
        title: bookmark.title,
        description: bookmark.description,
        domain: bookmark.domain,
        favicon: bookmark.favicon,
        sortOrder,
      };
    }),
    publishedAt: existing?.publishedAt || now,
    updatedAt: now,
  };
  await collections.replaceOne({ id: document.id, ownerId }, document, {
    upsert: true,
  });
  await tags.updateOne(
    { id: tagId, ownerId },
    { $set: { collectionId: document.id, updatedAt: now } },
  );
  return success(publicSharedCollection(document));
}

export async function listSharedCollections(
  ownerId: string,
): Promise<SharedCollection[]> {
  const documents = await (
    await getSharedCollectionsCollection()
  )
    .find({ ownerId: { $ne: ownerId } })
    .sort({ updatedAt: -1 })
    .limit(100)
    .toArray();
  return documents.map((document) =>
    publicSharedCollection(withoutSharedCollectionMongoId(document)),
  );
}

export async function unpublishTagCollection(
  ownerId: string,
  collectionId: string,
): Promise<boolean> {
  const collections = await getSharedCollectionsCollection();
  const collection = await collections.findOne({ id: collectionId, ownerId });
  if (!collection) return false;
  await collections.deleteOne({ id: collectionId, ownerId });
  await (
    await getTagsCollection()
  ).updateOne(
    { id: collection.sourceTagId, ownerId },
    { $set: { collectionId: null, updatedAt: new Date().toISOString() } },
  );
  return true;
}

export async function saveSharedCollection(
  ownerId: string,
  collectionId: string,
): Promise<Result<{ tag: Tag; savedCount: number }, ManagementError>> {
  const collection = await (
    await getSharedCollectionsCollection()
  ).findOne({ id: collectionId, ownerId: { $ne: ownerId } });
  if (!collection)
    return failure({ code: "NOT_FOUND", message: "共享合集不存在" });
  const tags = await getTagsCollection();
  let tagDocument = await tags.findOne({
    ownerId,
    parentId: null,
    name: collection.name,
  });
  if (!tagDocument) {
    const created = await createTag(ownerId, {
      name: collection.name,
      color: "#536dfe",
      parentId: null,
    });
    if (!created.ok) return created;
    tagDocument = await tags.findOne({ id: created.value.id, ownerId });
  }
  if (!tagDocument)
    return failure({ code: "NOT_FOUND", message: "无法创建本地标签" });
  let savedCount = 0;
  for (const item of collection.items.sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )) {
    const created = await createBookmark(ownerId, {
      url: item.url,
      title: item.title,
      description: item.description,
      siteId: null,
      folderId: null,
      tags: [tagDocument.id],
    });
    if (created.ok) savedCount += 1;
  }
  return success({
    tag: { ...withoutTagMongoId(tagDocument), count: savedCount },
    savedCount,
  });
}
