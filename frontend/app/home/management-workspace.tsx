"use client";

import { useMemo, useState } from "react";
import type React from "react";
import {
  Archive,
  ArrowUpRight,
  BarChart3,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Compass,
  Copy,
  Download,
  FolderOpen,
  Globe2,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Search,
  Settings2,
  Share2,
  Star,
  Trash2,
  X,
} from "lucide-react";
import type { Bookmark as BookmarkType, DashboardData } from "../../lib/types";
import {
  bookmarkBatchWriteResponse,
  folderResponse,
  fromPromise,
  sharedCollectionResponse,
  tagResponse,
  type Folder as FolderType,
  type JsonValue,
  type Publication,
  type SharedCollection,
  type Site,
  type Tag as TagType,
  type UserResponse,
} from "@loomark/shared";
import type { ThemeMode } from "../theme-provider";
import type { ThemeId } from "../theme-config";
import {
  accountIdentifier,
  apiFetch,
  filterByQuery,
  importedBookmarkPayloadSchema,
  importedFolderSchema,
  importedTagSchema,
  importedTagsSchema,
  handleBookmarkSurfaceClick,
  handleBookmarkSurfaceKeyDown,
  type ImportedFolder,
  type ImportedTag,
  IconNamePicker,
  LibraryIcon,
  LoadingState,
  makeCondition,
  operatorLabels,
  operatorNeedsValue,
  pageSlice,
  ThemeSwitcher,
  type ManagementSection,
  type QueryCondition,
  type QueryField,
  type QueryLogic,
  type QueryOperator,
  type QuerySource,
  type QueryState,
} from "./shared";

export type ManagementWorkspaceProps = {
  operationMessage: string | null;
  data: DashboardData;
  user: UserResponse;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  themeId: ThemeId;
  setThemeId: (themeId: ThemeId) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  managementSection: ManagementSection;
  setManagementSection: (section: ManagementSection) => void;
  managementQueries: Record<ManagementSection, QueryState>;
  updateManagementQuery: (section: ManagementSection, patch: Partial<QueryState>) => void;
  query: string;
  setQuery: (query: string) => void;
  sort: "recent" | "clicks" | "az";
  setSort: (sort: "recent" | "clicks" | "az") => void;
  loading: boolean;
  pageLoading: boolean;
  pageError: string | null;
  publications: Publication[];
  sharedCollections: SharedCollection[];
  savedPublicationIds: Set<string>;
  savedCollectionIds: Set<string>;
  discoverMode: "collections" | "links";
  setDiscoverMode: (mode: "collections" | "links") => void;
  showMenu: boolean;
  setShowMenu: React.Dispatch<React.SetStateAction<boolean>>;
  loggingOut: boolean;
  logout: () => void;
  openAddBookmark: (siteId?: string | null) => void;
  setShowAccount: (show: boolean) => void;
  setEditingBookmark: (bookmark: BookmarkType) => void;
  setFolderEditor: (folder: FolderType | "new") => void;
  setTagEditor: (tag: TagType | "new") => void;
  setSiteEditor: (site: Site | "new") => void;
  setPublishingTag: (tag: TagType) => void;
  toggleFavorite: (bookmark: BookmarkType) => void;
  toggleShare: (bookmark: BookmarkType) => void;
  deleteBookmark: (bookmark: BookmarkType) => void;
  deleteTag: (tag: TagType) => void;
  refreshDashboard: () => void;
  loadPage: (page: number) => void;
  loadDiscover: () => void;
  saveSharedBookmark: (publication: Publication) => void;
  saveCollection: (collection: SharedCollection) => void;
};

export default function ManagementWorkspace({
  operationMessage,
  data,
  user,
  mode,
  setMode,
  themeId,
  setThemeId,
  sidebarCollapsed,
  setSidebarCollapsed,
  managementSection,
  setManagementSection,
  managementQueries,
  updateManagementQuery,
  query,
  setQuery,
  sort,
  setSort,
  loading,
  pageLoading,
  pageError,
  publications,
  sharedCollections,
  savedPublicationIds,
  savedCollectionIds,
  discoverMode,
  setDiscoverMode,
  showMenu,
  setShowMenu,
  loggingOut,
  logout,
  openAddBookmark,
  setShowAccount,
  setEditingBookmark,
  setFolderEditor,
  setTagEditor,
  setSiteEditor,
  setPublishingTag,
  toggleFavorite,
  toggleShare,
  deleteBookmark,
  deleteTag,
  refreshDashboard,
  loadPage,
  loadDiscover,
  saveSharedBookmark,
  saveCollection,
}: ManagementWorkspaceProps) {
  return <>
    {operationMessage && <div className="operation-toast" role="status">{operationMessage}</div>}
    <div className="management-shell">
      <aside className={`management-sidebar ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <div className="brand"><span className="brand-mark"><Bookmark size={17} strokeWidth={2.6} /></span><span>bookmark-nav</span><button type="button" className="icon-button sidebar-toggle" onClick={() => setSidebarCollapsed((current) => !current)} aria-label={sidebarCollapsed ? "展开导航" : "收起导航"} title={sidebarCollapsed ? "展开导航" : "收起导航"}>{sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button></div>
        <nav className="management-nav" aria-label="管理栏目">
          <button type="button" className={managementSection === "bookmarks" ? "selected" : ""} onClick={() => setManagementSection("bookmarks")}><Bookmark size={16} />书签管理<span>{data.bookmarks.length}</span></button>
          <button type="button" className={managementSection === "folders" ? "selected" : ""} onClick={() => setManagementSection("folders")}><FolderOpen size={16} />目录管理<span>{data.folders.filter((folder) => folder.id !== "all").length}</span></button>
          <button type="button" className={managementSection === "tags" ? "selected" : ""} onClick={() => setManagementSection("tags")}><Settings2 size={16} />标签管理<span>{data.tags.length}</span></button>
          <button type="button" className={managementSection === "sites" ? "selected" : ""} onClick={() => setManagementSection("sites")}><Globe2 size={16} />网站管理<span>{data.sites.length}</span></button>
          <button type="button" className={managementSection === "sharing" ? "selected" : ""} onClick={() => setManagementSection("sharing")}><Share2 size={16} />分享管理<span>{sharedCollections.length + publications.length}</span></button>
        </nav>
        <div className="management-sidebar-bottom">
          <ThemeSwitcher mode={mode} setMode={setMode} themeId={themeId} setThemeId={setThemeId} />
          <a className="secondary-button management-back" href="/"><ChevronLeft size={15} />返回主页</a>
        </div>
      </aside>
      <main className="management-main">
        <header className="management-topbar">
          <div><p className="eyebrow">管理后台</p><h1>管理配置</h1></div>
          <div className="top-actions"><div className="top-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索书签..." /></div><button type="button" className="primary-button" onClick={() => openAddBookmark()}><Plus size={16} />添加书签</button><div className="menu-wrap"><button type="button" className="avatar mini" onClick={() => setShowMenu(!showMenu)} aria-label="打开账号菜单">{user.name.slice(0, 1).toUpperCase()}</button>{showMenu && <div className="user-menu"><strong>{user.name}</strong><span>{accountIdentifier(user.email)}</span><hr /><button type="button" onClick={() => { setShowAccount(true); setShowMenu(false); }}><Settings2 size={15} />账号设置</button><button type="button" disabled={loggingOut} onClick={() => logout()}><LogOut size={15} />{loggingOut ? "退出中..." : "退出登录"}</button></div>}</div></div>
        </header>
        <section className="management-content">
          <div className="management-summary" aria-label="管理概览">
            <div><span>书签</span><strong>{data.bookmarks.length}</strong></div>
            <div><span>目录</span><strong>{data.folders.filter((folder) => folder.id !== "all").length}</strong></div>
            <div><span>标签</span><strong>{data.tags.length}</strong></div>
            <div><span>网站</span><strong>{data.sites.length}</strong></div>
          </div>
          {managementSection === "bookmarks" && <BookmarkManagementPanel bookmarks={data.bookmarks} folders={data.folders.filter((folder) => folder.id !== "all")} tags={data.tags} sites={data.sites} query={managementQueries.bookmarks} quickSearch={query} sort={sort} loading={loading} error={null} onQueryChange={(patch) => updateManagementQuery("bookmarks", patch)} onSortChange={setSort} onAdd={() => openAddBookmark()} onEdit={setEditingBookmark} onFavorite={(bookmark) => toggleFavorite(bookmark)} onShare={(bookmark) => toggleShare(bookmark)} onDelete={(bookmark) => deleteBookmark(bookmark)} onImported={() => { refreshDashboard(); loadPage(1); }} />}
          {managementSection === "folders" && <FolderManagementPanel folders={data.folders.filter((folder) => folder.id !== "all")} query={managementQueries.folders} quickSearch={query} onQueryChange={(patch) => updateManagementQuery("folders", patch)} onCreate={() => setFolderEditor("new")} onEdit={setFolderEditor} />}
          {managementSection === "tags" && <TagManagementWorkspace tags={data.tags} query={managementQueries.tags} quickSearch={query} onQueryChange={(patch) => updateManagementQuery("tags", patch)} onCreate={() => setTagEditor("new")} onEdit={setTagEditor} onPublish={setPublishingTag} onDelete={(tag) => deleteTag(tag)} onImported={() => refreshDashboard()} />}
          {managementSection === "sites" && <SiteManagementPanel sites={data.sites} bookmarks={data.bookmarks} folders={data.folders.filter((folder) => folder.id !== "all")} tags={data.tags} query={managementQueries.sites} quickSearch={query} onQueryChange={(patch) => updateManagementQuery("sites", patch)} onCreate={() => setSiteEditor("new")} onEdit={setSiteEditor} onAddLink={(siteId) => openAddBookmark(siteId)} />}
          {managementSection === "sharing" && <SharingManagementPanel discoverMode={discoverMode} setDiscoverMode={setDiscoverMode} publications={publications} sharedCollections={sharedCollections} savedPublicationIds={savedPublicationIds} savedCollectionIds={savedCollectionIds} query={managementQueries.sharing} quickSearch={query} loading={pageLoading} error={pageError} onQueryChange={(patch) => updateManagementQuery("sharing", patch)} onReload={() => loadDiscover()} onSavePublication={(publication) => saveSharedBookmark(publication)} onSaveCollection={(collection) => saveCollection(collection)} />}
        </section>
      </main>
    </div>
  </>;
}

function ManagementQueryBuilder<T>({ fields, state, onChange, total, page, totalPages }: { fields: QueryField<T>[]; state: QueryState; onChange: (patch: Partial<QueryState>) => void; total: number; page: number; totalPages: number }) {
  const sourceFields = fields.filter((field) => field.source === state.source);
  const fallback = sourceFields[0] || fields[0];
  const conditionFields = sourceFields.length ? sourceFields : fields;
  const normalizeCondition = (condition: QueryCondition, source: QuerySource): QueryCondition => {
    const available = fields.filter((field) => field.source === source);
    const field = available.find((candidate) => candidate.id === condition.fieldId) || available[0] || fields[0];
    const operator = field.operators.includes(condition.operator) ? condition.operator : field.operators[0];
    return { ...condition, fieldId: field.id, operator, value: operatorNeedsValue(operator) ? condition.value : "" };
  };
  const updateCondition = (id: string, patch: Partial<QueryCondition>) => onChange({ page: 1, conditions: state.conditions.map((condition) => condition.id === id ? normalizeCondition({ ...condition, ...patch }, state.source) : condition) });
  return <div className="management-query-builder" aria-label="通用查询组件"><div className="query-builder-toolbar"><div className="query-source-toggle" aria-label="字段来源"><button className={state.source === "view" ? "active" : ""} onClick={() => onChange({ source: "view", page: 1, conditions: state.conditions.map((condition) => normalizeCondition(condition, "view")) })}>展示视图</button><button className={state.source === "table" ? "active" : ""} onClick={() => onChange({ source: "table", page: 1, conditions: state.conditions.map((condition) => normalizeCondition(condition, "table")) })}>表结构</button></div><label>组合<select value={state.logic} onChange={(event) => onChange({ logic: event.target.value as QueryLogic, page: 1 })}><option value="and">AND</option><option value="or">OR</option></select></label><label>每页<select value={state.pageSize} onChange={(event) => onChange({ pageSize: Number(event.target.value), page: 1 })}><option value={5}>5</option><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></label><span className="query-result-count">共 {total} 条</span></div><div className="query-condition-list">{state.conditions.map((condition) => { const field = conditionFields.find((candidate) => candidate.id === condition.fieldId) || fallback; const operator = field.operators.includes(condition.operator) ? condition.operator : field.operators[0]; return <div className="query-condition-row" key={condition.id}><select aria-label="查询字段" value={field.id} onChange={(event) => { const nextField = conditionFields.find((candidate) => candidate.id === event.target.value) || fallback; updateCondition(condition.id, { fieldId: nextField.id, operator: nextField.operators[0], value: "" }); }}>{conditionFields.map((candidate) => <option value={candidate.id} key={candidate.id}>{candidate.label}</option>)}</select><select aria-label="查询操作符" value={operator} onChange={(event) => updateCondition(condition.id, { operator: event.target.value as QueryOperator, value: "" })}>{field.operators.map((candidate) => <option value={candidate} key={candidate}>{operatorLabels[candidate]}</option>)}</select>{operatorNeedsValue(operator) && (field.options ? <select aria-label="查询值" value={condition.value} onChange={(event) => updateCondition(condition.id, { value: event.target.value })}><option value="">选择值</option>{field.options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select> : <input aria-label="查询值" value={condition.value} onChange={(event) => updateCondition(condition.id, { value: event.target.value })} placeholder={field.placeholder || "输入查询值"} />)}<button className="icon-button" aria-label="删除查询条件" disabled={state.conditions.length === 1} onClick={() => onChange({ page: 1, conditions: state.conditions.filter((item) => item.id !== condition.id) })}><X size={15} /></button></div>; })}</div><div className="query-builder-footer"><button className="secondary-button" onClick={() => fallback && onChange({ page: 1, conditions: [...state.conditions, makeCondition(fallback.id, fallback.operators[0])] })}><Plus size={14} />添加条件</button><button className="secondary-button" onClick={() => fallback && onChange({ page: 1, conditions: [makeCondition(fallback.id, fallback.operators[0])] })}>重置</button><div className="query-pagination"><button className="icon-button" disabled={page <= 1} onClick={() => onChange({ page: page - 1 })} aria-label="上一页"><ChevronLeft size={16} /></button><span>第 {page} / {totalPages || 1} 页</span><button className="icon-button" disabled={totalPages === 0 || page >= totalPages} onClick={() => onChange({ page: page + 1 })} aria-label="下一页"><ChevronRight size={16} /></button></div></div></div>;
}

function BookmarkManagementPanelLegacy({ bookmarks, folders, tags, sites, query, quickSearch, sort, loading, error, onQueryChange, onSortChange, onAdd, onEdit, onFavorite, onShare, onDelete }: { bookmarks: BookmarkType[]; folders: DashboardData["folders"]; tags: DashboardData["tags"]; sites: Site[]; query: QueryState; quickSearch: string; sort: "recent" | "clicks" | "az"; loading: boolean; error: string | null; onQueryChange: (patch: Partial<QueryState>) => void; onSortChange: (sort: "recent" | "clicks" | "az") => void; onAdd: () => void; onEdit: (bookmark: BookmarkType) => void; onFavorite: (bookmark: BookmarkType) => void; onShare: (bookmark: BookmarkType) => void; onDelete: (bookmark: BookmarkType) => void }) {
  const folderLabel = (bookmark: BookmarkType) => folders.find((folder) => folder.id === bookmark.folderId || folder.id === sites.find((site) => site.id === bookmark.siteId)?.folderId)?.name || "未分类";
  const tagLabels = (bookmark: BookmarkType) => bookmark.tags.map((id) => tags.find((tag) => tag.id === id)?.name).filter((name): name is string => Boolean(name));
  const fields = useMemo<QueryField<BookmarkType>[]>(() => [
    { id: "view.title", label: "标题", source: "view", operators: ["contains", "equals", "notEquals", "isEmpty", "isNotEmpty"], getValue: (bookmark) => bookmark.title },
    { id: "view.domain", label: "域名", source: "view", operators: ["contains", "equals", "notEquals"], getValue: (bookmark) => bookmark.domain },
    { id: "view.folder", label: "目录名称", source: "view", operators: ["contains", "equals", "notEquals"], getValue: folderLabel, options: folders.map((folder) => ({ label: folder.name, value: folder.name })) },
    { id: "view.tags", label: "标签名称", source: "view", operators: ["contains", "equals", "notEquals"], getValue: (bookmark) => tagLabels(bookmark), options: tags.map((tag) => ({ label: tag.name, value: tag.name })) },
    { id: "view.status", label: "状态", source: "view", operators: ["contains", "equals", "notEquals"], getValue: (bookmark) => [bookmark.isFavorite ? "收藏" : "", bookmark.publicationId ? "已分享" : ""].filter(Boolean), options: [{ label: "收藏", value: "收藏" }, { label: "已分享", value: "已分享" }] },
    { id: "view.clicks", label: "访问次数", source: "view", operators: ["gt", "lt", "equals"], getValue: (bookmark) => bookmark.clicks, placeholder: "数字" },
    { id: "table.id", label: "id", source: "table", operators: ["contains", "equals", "notEquals"], getValue: (bookmark) => bookmark.id },
    { id: "table.siteId", label: "siteId", source: "table", operators: ["contains", "equals", "notEquals"], getValue: (bookmark) => bookmark.siteId },
    { id: "table.folderId", label: "folderId", source: "table", operators: ["contains", "equals", "notEquals", "isEmpty", "isNotEmpty"], getValue: (bookmark) => bookmark.folderId },
    { id: "table.tags", label: "tags", source: "table", operators: ["contains", "equals", "notEquals", "isEmpty", "isNotEmpty"], getValue: (bookmark) => bookmark.tags },
    { id: "table.url", label: "url", source: "table", operators: ["contains", "equals", "notEquals"], getValue: (bookmark) => bookmark.url },
    { id: "table.description", label: "description", source: "table", operators: ["contains", "equals", "notEquals", "isEmpty", "isNotEmpty"], getValue: (bookmark) => bookmark.description },
    { id: "table.clicks", label: "clicks", source: "table", operators: ["gt", "lt", "equals"], getValue: (bookmark) => bookmark.clicks, placeholder: "数字" },
    { id: "table.isFavorite", label: "isFavorite", source: "table", operators: ["equals", "notEquals"], getValue: (bookmark) => bookmark.isFavorite, options: [{ label: "true", value: "true" }, { label: "false", value: "false" }] },
  ], [folders, tags, sites]);
  const filtered = useMemo(() => filterByQuery(bookmarks, fields, query, quickSearch), [bookmarks, fields, query, quickSearch]);
  const sorted = useMemo(() => [...filtered].sort((a, b) => sort === "clicks" ? b.clicks - a.clicks : sort === "az" ? a.title.localeCompare(b.title) : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [filtered, sort]);
  const pageInfo = pageSlice(sorted, query);
  return <section className="management-panel"><div className="management-panel-header"><div><h2>书签管理</h2><span>{pageInfo.total} 条书签</span></div><button className="primary-button" onClick={onAdd}><Plus size={15} />新增</button></div><ManagementQueryBuilder fields={fields} state={query} onChange={onQueryChange} total={pageInfo.total} page={pageInfo.page} totalPages={pageInfo.totalPages} /><div className="management-sort-row"><label>排序<select value={sort} onChange={(event) => onSortChange(event.target.value as "recent" | "clicks" | "az")}><option value="recent">最近添加</option><option value="clicks">访问最多</option><option value="az">名称排序</option></select></label></div>{loading ? <LoadingState /> : error ? <div className="empty"><Archive size={30} /><strong>书签加载失败</strong><span>{error}</span></div> : pageInfo.items.length ? <div className="bookmark-table-wrap management-table-wrap"><table className="bookmark-table"><thead><tr><th>书签</th><th>目录</th><th>标签</th><th>状态</th><th aria-label="操作" /></tr></thead><tbody>{pageInfo.items.map((bookmark) => <tr key={bookmark.id}><td><div className="table-title"><div className="favicon"><img src={bookmark.favicon} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /></div><a href={bookmark.url} target="_blank" rel="noreferrer"><strong>{bookmark.title}</strong><span>{bookmark.domain}</span></a></div></td><td>{folderLabel(bookmark)}</td><td><div className="list-tags">{bookmark.tags.map((id) => { const tag = tags.find((item) => item.id === id); return tag ? <span key={id} style={{ "--tag-color": tag.color } as React.CSSProperties}>#{tag.name}</span> : null; })}</div></td><td><div className="management-status"><span><BarChart3 size={12} />{bookmark.clicks}</span>{bookmark.isFavorite && <span><Star size={12} />收藏</span>}{bookmark.publicationId && <span><Share2 size={12} />已分享</span>}</div></td><td><div className="management-actions"><button className={bookmark.publicationId ? "shared-active" : ""} onClick={() => onShare(bookmark)} title={bookmark.publicationId ? `取消分享${bookmark.title}` : `分享${bookmark.title}`} aria-label={bookmark.publicationId ? `取消分享${bookmark.title}` : `分享${bookmark.title}`}><Share2 size={15} /></button><button className={bookmark.isFavorite ? "favorite-active" : ""} onClick={() => onFavorite(bookmark)} title={bookmark.isFavorite ? `取消收藏${bookmark.title}` : `收藏${bookmark.title}`} aria-label={bookmark.isFavorite ? `取消收藏${bookmark.title}` : `收藏${bookmark.title}`}><Star size={15} fill={bookmark.isFavorite ? "currentColor" : "none"} /></button><button onClick={() => onEdit(bookmark)} title={`编辑${bookmark.title}`} aria-label={`编辑${bookmark.title}`}><Pencil size={15} /></button><button className="danger-icon" onClick={() => onDelete(bookmark)} title={`删除${bookmark.title}`} aria-label={`删除${bookmark.title}`}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div> : <div className="empty"><Archive size={30} /><strong>没有匹配的书签</strong><span>可以调整查询条件或字段来源</span><button className="primary-button" onClick={onAdd}><Plus size={15} />新增</button></div>}</section>;
}

function BookmarkImportExport({ bookmarks, folders, tags, onImported }: { bookmarks: BookmarkType[]; folders: FolderType[]; tags: TagType[]; onImported: () => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const example = `{
  "format": "bookmark-nav-bookmarks",
  "version": 1,
  "folders": [
    { "name": "开发", "iconLibrary": "lucide", "iconName": "Code2" }
  ],
  "tags": [
    { "name": "AI 工具", "color": "#536DFE", "iconLibrary": "lucide", "iconName": "Bot", "parentName": null }
  ],
  "bookmarks": [
    {
      "url": "https://example.com",
      "title": "示例网站",
      "description": "网站用途简介",
      "folderName": "开发",
      "tags": ["AI 工具"],
      "isFavorite": false
    }
  ]
}`;
  const prompt = `你是一个书签整理助手。请推荐一批真实、实用的网站，并严格按照下面的 JSON 结构输出。只返回一个合法 JSON 对象，不要输出 Markdown 代码块、解释文字或注释。

${example}

生成规则：
1. format 固定为 "bookmark-nav-bookmarks"，version 固定为 1。
2. folders 是目录数组；name 必填，iconLibrary 只能是 "lucide"、"emoji"、"custom"，iconName 使用对应图标名。
3. tags 是标签数组；color 必须是 6 位十六进制颜色（例如 #536DFE）；顶级标签的 parentName 必须为 null，子标签的 parentName 必须填写已有顶级标签名称。
4. bookmarks 是书签数组；每个 url 必须是完整的纯文本 HTTPS URL，例如 https://example.com，不要使用 [标题](URL) 或其他 Markdown 格式。
5. title、description 可以是中文；folderName 必须引用 folders 中的 name；tags 必须引用 tags 中的 name；没有目录或标签时使用 null 或空数组。
6. 不要生成重复 URL，不要编造无法访问的网站，不要把 id、ownerId、siteId 放入 JSON。`;
  function exportBookmarks(): void {
    const payload = { format: "bookmark-nav-bookmarks", version: 1, folders: folders.map(({ name, iconLibrary, iconName }) => ({ name, iconLibrary, iconName })), tags: tags.map(({ name, color, iconLibrary, iconName, parentId }) => ({ name, color, iconLibrary, iconName, parentName: parentId ? tags.find((item) => item.id === parentId)?.name || null : null })), bookmarks: bookmarks.map((bookmark) => ({ url: bookmark.url, title: bookmark.title, description: bookmark.description, folderName: folders.find((folder) => folder.id === bookmark.folderId)?.name || null, tags: bookmark.tags.map((id) => tags.find((tag) => tag.id === id)?.name).filter((name): name is string => Boolean(name)), isFavorite: bookmark.isFavorite })) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = `bookmark-nav-bookmarks-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url);
  }
  async function createOrFind(kind: "folder" | "tag", item: ImportedFolder | ImportedTag, parentId: string | null): Promise<string> {
    const path = kind === "folder" ? "/api/v1/folders" : "/api/v1/tags";
    const body = kind === "folder" ? { name: item.name, iconLibrary: item.iconLibrary, iconName: item.iconName } : { name: item.name, color: "color" in item ? item.color : "#536dfe", iconLibrary: item.iconLibrary, iconName: item.iconName, parentId };
    const response = await apiFetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const value = await response.json() as unknown;
    const parsed = (kind === "folder" ? folderResponse : tagResponse).safeParse(value);
    if (response.ok && parsed.success) return parsed.data.id;
    const errorMessage = typeof value === "object" && value !== null && "error" in value && typeof value.error === "string" ? value.error : "";
    if (errorMessage.includes("同名")) return "";
    throw new Error(errorMessage || `无法创建${kind === "folder" ? "目录" : "标签"}“${item.name}”`);
  }
  async function importBookmarks(): Promise<void> {
    setMessage("");
    let raw: unknown;
    try { raw = JSON.parse(text); } catch { setMessage("JSON 格式不正确。现有书签不会改变。"); return; }
    const normalizedRaw = typeof raw === "object" && raw !== null && !Array.isArray(raw) && "bookmarks" in raw && Array.isArray(raw.bookmarks)
      ? { ...raw, bookmarks: raw.bookmarks.map((item) => typeof item === "object" && item !== null && "url" in item && typeof item.url === "string" ? { ...item, url: item.url.match(/^\[[^\]]*\]\((https?:\/\/[^)]+)\)$/)?.[1] || item.url } : item) }
      : raw;
    const parsed = importedBookmarkPayloadSchema.safeParse(normalizedRaw);
    if (!parsed.success) { setMessage("内容格式不符合书签导入模板，请检查 folders、tags、bookmarks 字段。"); return; }
    setBusy(true);
    const folderIds = new Map(folders.map((folder) => [folder.name, folder.id]));
    const tagIds = new Map(tags.map((tag) => [tag.name, tag.id]));
    try {
      for (const folder of parsed.data.folders) { const id = await createOrFind("folder", folder, null); if (id) folderIds.set(folder.name, id); else folderIds.set(folder.name, folders.find((item) => item.name === folder.name)?.id || ""); }
      const orderedTags = [...parsed.data.tags].sort((a, b) => Number(Boolean(a.parentName)) - Number(Boolean(b.parentName)));
      for (const tag of orderedTags) { const parentId = tag.parentName ? tagIds.get(tag.parentName) || null : null; if (tag.parentName && !parentId) throw new Error(`找不到父标签“${tag.parentName}”`); const id = await createOrFind("tag", tag, parentId); if (id) tagIds.set(tag.name, id); else tagIds.set(tag.name, tags.find((item) => item.name === tag.name)?.id || ""); }
      const bookmarkItems = [];
      for (const bookmark of parsed.data.bookmarks) {
        let folderId = bookmark.folderName ? folderIds.get(bookmark.folderName) || null : null;
        if (bookmark.folderName && !folderId) { const id = await createOrFind("folder", { name: bookmark.folderName, iconLibrary: "lucide", iconName: "Folder" }, null); folderId = id || null; if (folderId) folderIds.set(bookmark.folderName, folderId); }
        const tagIdList = bookmark.tags.map((name) => tagIds.get(name) || "").filter(Boolean);
        for (const name of bookmark.tags) if (!tagIds.has(name)) { const id = await createOrFind("tag", { name, color: "#536dfe", iconLibrary: "lucide", iconName: "Tag", parentName: null }, null); if (id) { tagIds.set(name, id); tagIdList.push(id); } }
        bookmarkItems.push({ url: bookmark.url, title: bookmark.title, description: bookmark.description, folderId, tags: tagIdList, siteId: null, isFavorite: bookmark.isFavorite });
      }
      const response = await apiFetch("/api/v1/bookmarks/batch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: bookmarkItems, updateExisting: true }) });
      const value = await response.json() as unknown;
      const batch = bookmarkBatchWriteResponse.safeParse(value);
      if (!response.ok || !batch.success) throw new Error("批量导入书签失败");
      setText(""); setMessage(`导入完成：新增 ${batch.data.created} 个，更新 ${batch.data.updated} 个书签。`); onImported();
    } catch (error) { setMessage(error instanceof Error ? error.message : "导入失败，请稍后重试。"); }
    finally { setBusy(false); }
  }
  async function copyPrompt(): Promise<void> { await navigator.clipboard.writeText(prompt); setMessage("提示词已复制。"); }
  return <><button type="button" className="secondary-button" onClick={() => { setOpen(true); setMessage(""); }}><Download size={15} />导入书签</button><button type="button" className="secondary-button" onClick={exportBookmarks} disabled={!bookmarks.length}><Download size={15} />导出书签</button>{open && <div className="modal-layer" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}><div className="modal tag-import-modal"><div className="modal-header"><div><p className="eyebrow">AI 辅助</p><h2>导入书签 JSON</h2></div><button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="关闭"><X size={18} /></button></div><div className="tag-prompt-box"><div><strong>给 AI 的提示词模板</strong><span>复制后补充你的偏好，再将 AI 返回的 JSON 粘贴到下方。</span></div><textarea value={prompt} readOnly rows={7} aria-label="AI 书签提示词模板" /><button type="button" className="secondary-button" onClick={() => void copyPrompt()}><Copy size={14} />复制提示词</button></div><label>粘贴书签 JSON<textarea aria-label="书签 JSON 导入内容" value={text} onChange={(event) => setText(event.target.value)} placeholder={example} rows={8} /></label>{message && <p className="tag-import-message" role="status">{message}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setOpen(false)}>取消</button><button type="button" className="primary-button" disabled={busy || !text.trim()} onClick={() => void importBookmarks()}>{busy ? "导入中..." : "导入书签"}</button></div></div></div>}</>;
}

function BookmarkManagementPanel(props: Parameters<typeof BookmarkManagementPanelLegacy>[0] & { onImported: () => void }) {
  return <div className="bookmark-management-wrapper"><div className="bookmark-import-toolbar"><BookmarkImportExport bookmarks={props.bookmarks} folders={props.folders} tags={props.tags} onImported={props.onImported} /></div><BookmarkManagementPanelLegacy {...props} /></div>;
}

function FolderManagementPanel({ folders, query, quickSearch, onQueryChange, onCreate, onEdit }: { folders: DashboardData["folders"]; query: QueryState; quickSearch: string; onQueryChange: (patch: Partial<QueryState>) => void; onCreate: () => void; onEdit: (folder: FolderType) => void }) {
  const fields = useMemo<QueryField<FolderType>[]>(() => [
    { id: "view.folderName", label: "目录名称", source: "view", operators: ["contains", "equals", "notEquals"], getValue: (folder) => folder.name },
    { id: "view.icon", label: "图标", source: "view", operators: ["contains", "equals", "notEquals", "isEmpty", "isNotEmpty"], getValue: (folder) => `${folder.iconLibrary}:${folder.iconName}` },
    { id: "view.count", label: "书签数", source: "view", operators: ["gt", "lt", "equals"], getValue: (folder) => folder.count, placeholder: "数字" },
    { id: "table.id", label: "id", source: "table", operators: ["contains", "equals", "notEquals"], getValue: (folder) => folder.id },
    { id: "table.name", label: "name", source: "table", operators: ["contains", "equals", "notEquals"], getValue: (folder) => folder.name },
    { id: "table.iconName", label: "iconName", source: "table", operators: ["contains", "equals", "notEquals"], getValue: (folder) => folder.iconName },
    { id: "table.iconLibrary", label: "iconLibrary", source: "table", operators: ["contains", "equals", "notEquals"], getValue: (folder) => folder.iconLibrary },
    { id: "table.count", label: "count", source: "table", operators: ["gt", "lt", "equals"], getValue: (folder) => folder.count, placeholder: "数字" },
  ], []);
  const pageInfo = pageSlice(filterByQuery(folders, fields, query, quickSearch), query);
  return <section className="management-panel"><div className="management-panel-header"><div><h2>目录管理</h2><span>{pageInfo.total} 个目录</span></div><button className="primary-button" onClick={onCreate}><Plus size={15} />新建目录</button></div><ManagementQueryBuilder fields={fields} state={query} onChange={onQueryChange} total={pageInfo.total} page={pageInfo.page} totalPages={pageInfo.totalPages} /><div className="management-list">{pageInfo.items.length ? pageInfo.items.map((folder) => <article className="management-row-card" key={folder.id}><div><span className="folder-icon"><LibraryIcon library={folder.iconLibrary} name={folder.iconName} /></span><strong>{folder.name}</strong><small>{folder.count} 个书签</small></div><button className="secondary-button" aria-label={`编辑${folder.name}`} onClick={() => onEdit(folder)}><Pencil size={14} />编辑</button></article>) : <div className="empty"><FolderOpen size={30} /><strong>没有匹配的目录</strong><button className="primary-button" onClick={onCreate}><Plus size={15} />新建目录</button></div>}</div></section>;
}

function TagManagementWorkspace({ tags, query, quickSearch, onQueryChange, onCreate, onEdit, onPublish, onDelete, onImported }: { tags: TagType[]; query: QueryState; quickSearch: string; onQueryChange: (patch: Partial<QueryState>) => void; onCreate: () => void; onEdit: (tag: TagType) => void; onPublish: (tag: TagType) => void; onDelete: (tag: TagType) => void; onImported: () => void }) {
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const roots = tags.filter((tag) => !tag.parentId);
  const ordered = roots.flatMap((root) => [root, ...tags.filter((tag) => tag.parentId === root.id)]);
  const fields = useMemo<QueryField<TagType>[]>(() => [
    { id: "view.tagName", label: "标签名称", source: "view", operators: ["contains", "equals", "notEquals"], getValue: (tag) => tag.name },
    { id: "view.level", label: "层级", source: "view", operators: ["equals", "notEquals"], getValue: (tag) => tag.parentId ? "子标签" : "顶级标签", options: [{ label: "顶级标签", value: "顶级标签" }, { label: "子标签", value: "子标签" }] },
    { id: "view.publishState", label: "发布状态", source: "view", operators: ["equals", "notEquals"], getValue: (tag) => tag.collectionId ? "已发布" : "未发布", options: [{ label: "已发布", value: "已发布" }, { label: "未发布", value: "未发布" }] },
    { id: "view.count", label: "书签数", source: "view", operators: ["gt", "lt", "equals"], getValue: (tag) => tag.count, placeholder: "数字" },
    { id: "table.id", label: "id", source: "table", operators: ["contains", "equals", "notEquals"], getValue: (tag) => tag.id },
    { id: "table.name", label: "name", source: "table", operators: ["contains", "equals", "notEquals"], getValue: (tag) => tag.name },
    { id: "table.parentId", label: "parentId", source: "table", operators: ["contains", "equals", "notEquals", "isEmpty", "isNotEmpty"], getValue: (tag) => tag.parentId },
    { id: "table.collectionId", label: "collectionId", source: "table", operators: ["contains", "equals", "notEquals", "isEmpty", "isNotEmpty"], getValue: (tag) => tag.collectionId },
    { id: "table.count", label: "count", source: "table", operators: ["gt", "lt", "equals"], getValue: (tag) => tag.count, placeholder: "数字" },
  ], []);
  const pageInfo = pageSlice(filterByQuery(ordered, fields, query, quickSearch), query);
  function exportTags(): void {
    const payload = { format: "bookmark-nav-tags", version: 1, tags: tags.map((tag) => ({ name: tag.name, color: tag.color, iconLibrary: tag.iconLibrary, iconName: tag.iconName, parentName: tag.parentId ? tags.find((parent) => parent.id === tag.parentId)?.name || null : null })) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `bookmark-nav-tags-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
  async function importTags(): Promise<void> {
    setImportMessage("");
    let parsedJson: unknown;
    try { parsedJson = JSON.parse(importText); } catch { setImportMessage("JSON 格式不正确，请检查括号和逗号。现有标签不会改变。"); return; }
    const parsed = importedTagsSchema.safeParse(parsedJson);
    if (!parsed.success) { setImportMessage("标签 JSON 内容不符合格式，请参考下方示例。"); return; }
    const incoming = Array.isArray(parsed.data) ? parsed.data : parsed.data.tags;
    const ordered = [...incoming].sort((a, b) => Number(Boolean(a.parentName)) - Number(Boolean(b.parentName)));
    const known = new Map(tags.map((tag) => [tag.name, tag]));
    let created = 0;
    let skipped = 0;
    setImporting(true);
    try {
      for (const item of ordered) {
        const parentId = item.parentName ? known.get(item.parentName)?.id || null : null;
        if (item.parentName && !parentId) throw new Error(`找不到父标签“${item.parentName}”，请先导入它。`);
        const response = await apiFetch("/api/v1/tags", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: item.name, color: item.color, iconLibrary: item.iconLibrary, iconName: item.iconName, parentId }) });
        const body = await response.json() as unknown;
        const result = tagResponse.safeParse(body);
        if (response.ok && result.success) { known.set(item.name, result.data); created += 1; continue; }
        const errorMessage = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string" ? body.error : "";
        if (errorMessage.includes("同级下已存在同名标签")) { skipped += 1; continue; }
        throw new Error(errorMessage || `导入“${item.name}”失败。`);
      }
      setImportText("");
      setImportMessage(`导入完成：新增 ${created} 个，跳过重复标签 ${skipped} 个。`);
      onImported();
    } catch (error) { setImportMessage(error instanceof Error ? error.message : "导入失败，请稍后重试。"); }
    finally { setImporting(false); }
  }
  const example = '{\n  "tags": [\n    { "name": "开发工具", "color": "#536dfe", "iconLibrary": "lucide", "iconName": "Code2" },\n    { "name": "文档", "color": "#2a9d72", "parentName": "开发工具" }\n  ]\n}';
  const prompt = `请为我的书签导航生成一组实用的网站分类标签。只返回 JSON，不要 Markdown 代码块，格式如下：\n${example}\n要求：name 为 1-30 个字符；color 使用 6 位十六进制颜色；iconLibrary 只能是 lucide、emoji 或 custom；iconName 使用对应图标名；子标签通过 parentName 指向已有顶级标签。`;
  async function copyPrompt(): Promise<void> {
    await navigator.clipboard.writeText(prompt);
    setPromptCopied(true);
    window.setTimeout(() => setPromptCopied(false), 1800);
  }
  return <section className="management-panel"><div className="management-panel-header"><div><h2>标签管理</h2><span>{pageInfo.total} 个标签</span></div><div className="management-panel-actions"><button className="secondary-button" onClick={() => { setShowImport(true); setImportMessage(""); }}><Download size={15} />导入 JSON</button><button className="secondary-button" onClick={exportTags} disabled={!tags.length}><Download size={15} />导出 JSON</button><button className="primary-button" onClick={onCreate}><Plus size={15} />新建标签</button></div></div>{showImport && <div className="modal-layer" onMouseDown={(event) => event.target === event.currentTarget && setShowImport(false)}><div className="modal tag-import-modal"><div className="modal-header"><div><p className="eyebrow">AI 辅助</p><h2>导入标签 JSON</h2></div><button type="button" className="icon-button" onClick={() => setShowImport(false)} aria-label="关闭"><X size={18} /></button></div><div className="tag-prompt-box"><div><strong>给 AI 的提示词模板</strong><span>复制后补充你的偏好，再把 AI 返回的 JSON 粘贴到下方。</span></div><textarea value={prompt} readOnly rows={7} aria-label="AI 提示词模板" /><button type="button" className="secondary-button" onClick={() => void copyPrompt()}><Copy size={14} />{promptCopied ? "已复制" : "复制提示词"}</button></div><label>粘贴 JSON<textarea aria-label="标签 JSON 导入内容" value={importText} onChange={(event) => setImportText(event.target.value)} placeholder={example} rows={7} /></label>{importMessage && <p className="tag-import-message" role="status">{importMessage}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowImport(false)}>取消</button><button type="button" className="primary-button" disabled={importing || !importText.trim()} onClick={() => void importTags()}><Download size={15} />{importing ? "导入中..." : "导入标签"}</button></div></div></div>}<ManagementQueryBuilder fields={fields} state={query} onChange={onQueryChange} total={pageInfo.total} page={pageInfo.page} totalPages={pageInfo.totalPages} /><div className="management-list tag-management-list">{pageInfo.items.length ? pageInfo.items.map((tag) => <article className={`management-row-card ${tag.parentId ? "child" : ""}`} key={tag.id}><div><span className="tag-dot" style={{ background: tag.color }} /><strong>{tag.name}</strong><small>{tag.count} 个书签{tag.collectionId ? " · 已发布" : ""}</small></div><div className="management-row-actions"><button className={tag.collectionId ? "secondary-button shared-active" : "secondary-button"} aria-label={tag.collectionId ? `同步合集${tag.name}` : `发布标签${tag.name}`} onClick={() => onPublish(tag)}><Share2 size={14} />{tag.collectionId ? "同步" : "发布"}</button><button className="secondary-button" aria-label={`编辑${tag.name}`} onClick={() => onEdit(tag)}><Pencil size={14} />编辑</button><button className="secondary-button danger-button" aria-label={`删除${tag.name}`} onClick={() => onDelete(tag)}><Trash2 size={14} />删除</button></div></article>) : <div className="empty"><Settings2 size={30} /><strong>没有匹配的标签</strong><button className="primary-button" onClick={onCreate}><Plus size={15} />新建标签</button></div>}</div></section>;
}

function SiteManagementPanel({ sites, bookmarks, folders, tags, query, quickSearch, onQueryChange, onCreate, onEdit, onAddLink }: { sites: Site[]; bookmarks: BookmarkType[]; folders: DashboardData["folders"]; tags: TagType[]; query: QueryState; quickSearch: string; onQueryChange: (patch: Partial<QueryState>) => void; onCreate: () => void; onEdit: (site: Site) => void; onAddLink: (siteId: string) => void }) {
  const tagLabels = (site: Site) => site.tags.map((id) => tags.find((tag) => tag.id === id)?.name).filter((name): name is string => Boolean(name));
  const folderLabel = (site: Site) => folders.find((folder) => folder.id === site.folderId)?.name || "未分类";
  const fields = useMemo<QueryField<Site>[]>(() => [
    { id: "view.siteName", label: "网站名称", source: "view", operators: ["contains", "equals", "notEquals"], getValue: (site) => site.name },
    { id: "view.domain", label: "域名", source: "view", operators: ["contains", "equals", "notEquals"], getValue: (site) => site.domain },
    { id: "view.folder", label: "目录名称", source: "view", operators: ["contains", "equals", "notEquals"], getValue: folderLabel, options: folders.map((folder) => ({ label: folder.name, value: folder.name })) },
    { id: "view.tags", label: "标签名称", source: "view", operators: ["contains", "equals", "notEquals", "isEmpty", "isNotEmpty"], getValue: tagLabels, options: tags.map((tag) => ({ label: tag.name, value: tag.name })) },
    { id: "view.count", label: "子链接数", source: "view", operators: ["gt", "lt", "equals"], getValue: (site) => bookmarks.filter((bookmark) => bookmark.siteId === site.id).length, placeholder: "数字" },
    { id: "table.id", label: "id", source: "table", operators: ["contains", "equals", "notEquals"], getValue: (site) => site.id },
    { id: "table.name", label: "name", source: "table", operators: ["contains", "equals", "notEquals"], getValue: (site) => site.name },
    { id: "table.homepageUrl", label: "homepageUrl", source: "table", operators: ["contains", "equals", "notEquals"], getValue: (site) => site.homepageUrl },
    { id: "table.domain", label: "domain", source: "table", operators: ["contains", "equals", "notEquals"], getValue: (site) => site.domain },
    { id: "table.folderId", label: "folderId", source: "table", operators: ["contains", "equals", "notEquals", "isEmpty", "isNotEmpty"], getValue: (site) => site.folderId },
    { id: "table.tags", label: "tags", source: "table", operators: ["contains", "equals", "notEquals", "isEmpty", "isNotEmpty"], getValue: (site) => site.tags },
  ], [folders, tags, bookmarks]);
  const pageInfo = pageSlice(filterByQuery(sites, fields, query, quickSearch), query);
  return <section className="management-panel"><div className="management-panel-header"><div><h2>网站管理</h2><span>{pageInfo.total} 个网站</span></div><button className="primary-button" onClick={onCreate}><Plus size={15} />新建网站</button></div><ManagementQueryBuilder fields={fields} state={query} onChange={onQueryChange} total={pageInfo.total} page={pageInfo.page} totalPages={pageInfo.totalPages} /><div className="management-grid">{pageInfo.items.length ? pageInfo.items.map((site) => { const items = bookmarks.filter((bookmark) => bookmark.siteId === site.id); return <article className="management-site-card" key={site.id}><header><div className="favicon"><img src={site.favicon} alt="" /></div><div><strong>{site.name}</strong><span>{site.domain}</span></div></header>{site.tags.length > 0 && <div className="site-tags">{site.tags.map((id) => { const tag = tags.find((item) => item.id === id); return tag ? <span key={id} style={{ "--tag-color": tag.color } as React.CSSProperties}>#{tag.name}</span> : null; })}</div>}<div className="management-site-meta"><span>{items.length} 个子链接</span><span>{site.folderId ? folderLabel(site) : "未分类"}</span></div><footer><button className="secondary-button" aria-label={`编辑${site.name}`} onClick={() => onEdit(site)}><Pencil size={14} />编辑</button><button className="primary-button" aria-label={`为${site.name}添加子链接`} onClick={() => onAddLink(site.id)}><Plus size={14} />添加子链接</button></footer></article>; }) : <div className="empty"><Globe2 size={30} /><strong>没有匹配的网站</strong><button className="primary-button" onClick={onCreate}><Plus size={15} />新建网站</button></div>}</div></section>;
}

function SharingManagementPanel({ discoverMode, setDiscoverMode, publications, sharedCollections, savedPublicationIds, savedCollectionIds, query, quickSearch, loading, error, onQueryChange, onReload, onSavePublication, onSaveCollection }: { discoverMode: "collections" | "links"; setDiscoverMode: (mode: "collections" | "links") => void; publications: Publication[]; sharedCollections: SharedCollection[]; savedPublicationIds: Set<string>; savedCollectionIds: Set<string>; query: QueryState; quickSearch: string; loading: boolean; error: string | null; onQueryChange: (patch: Partial<QueryState>) => void; onReload: () => void; onSavePublication: (publication: Publication) => void; onSaveCollection: (collection: SharedCollection) => void }) {
  const collectionFields = useMemo<QueryField<SharedCollection>[]>(() => [
    { id: "view.title", label: "合集名称", source: "view", operators: ["contains", "equals", "notEquals"], getValue: (collection) => collection.name },
    { id: "view.author", label: "作者", source: "view", operators: ["contains", "equals", "notEquals"], getValue: (collection) => collection.author.name },
    { id: "view.description", label: "描述", source: "view", operators: ["contains", "equals", "notEquals", "isEmpty", "isNotEmpty"], getValue: (collection) => collection.description },
    { id: "view.count", label: "条目数", source: "view", operators: ["gt", "lt", "equals"], getValue: (collection) => collection.items.length, placeholder: "数字" },
    { id: "table.id", label: "id", source: "table", operators: ["contains", "equals", "notEquals"], getValue: (collection) => collection.id },
    { id: "table.sourceTagId", label: "sourceTagId", source: "table", operators: ["contains", "equals", "notEquals"], getValue: (collection) => collection.sourceTagId },
    { id: "table.name", label: "name", source: "table", operators: ["contains", "equals", "notEquals"], getValue: (collection) => collection.name },
  ], []);
  const publicationFields = useMemo<QueryField<Publication>[]>(() => [
    { id: "view.title", label: "标题", source: "view", operators: ["contains", "equals", "notEquals"], getValue: (publication) => publication.title },
    { id: "view.author", label: "作者", source: "view", operators: ["contains", "equals", "notEquals"], getValue: (publication) => publication.author.name },
    { id: "view.domain", label: "域名", source: "view", operators: ["contains", "equals", "notEquals"], getValue: (publication) => publication.domain },
    { id: "view.description", label: "描述", source: "view", operators: ["contains", "equals", "notEquals", "isEmpty", "isNotEmpty"], getValue: (publication) => publication.description },
    { id: "table.id", label: "id", source: "table", operators: ["contains", "equals", "notEquals"], getValue: (publication) => publication.id },
    { id: "table.sourceBookmarkId", label: "sourceBookmarkId", source: "table", operators: ["contains", "equals", "notEquals"], getValue: (publication) => publication.sourceBookmarkId },
    { id: "table.url", label: "url", source: "table", operators: ["contains", "equals", "notEquals"], getValue: (publication) => publication.url },
  ], []);
  const filteredCollections = pageSlice(filterByQuery(sharedCollections, collectionFields, query, quickSearch), query);
  const filteredPublications = pageSlice(filterByQuery(publications, publicationFields, query, quickSearch), query);
  const resultCount = discoverMode === "collections" ? filteredCollections.total : filteredPublications.total;
  return <section className="management-panel"><div className="management-panel-header"><div><h2>分享管理</h2><span>{resultCount} 个公开内容</span></div><div className="discovery-tabs" role="tablist" aria-label="发现内容类型"><button role="tab" aria-selected={discoverMode === "collections"} className={discoverMode === "collections" ? "active" : ""} onClick={() => setDiscoverMode("collections")}>共享合集</button><button role="tab" aria-selected={discoverMode === "links"} className={discoverMode === "links" ? "active" : ""} onClick={() => setDiscoverMode("links")}>单条分享</button></div></div>{discoverMode === "collections" ? <ManagementQueryBuilder fields={collectionFields} state={query} onChange={onQueryChange} total={filteredCollections.total} page={filteredCollections.page} totalPages={filteredCollections.totalPages} /> : <ManagementQueryBuilder fields={publicationFields} state={query} onChange={onQueryChange} total={filteredPublications.total} page={filteredPublications.page} totalPages={filteredPublications.totalPages} />}{loading ? <LoadingState /> : error ? <div className="empty"><Archive size={30} /><strong>分享加载失败</strong><span>{error}</span><button className="secondary-button" onClick={onReload}>重新加载</button></div> : discoverMode === "collections" ? filteredCollections.items.length ? <SharedCollectionGrid collections={filteredCollections.items} savedIds={savedCollectionIds} canSave onSave={onSaveCollection} /> : <div className="empty"><Compass size={30} /><strong>没有匹配的共享合集</strong></div> : filteredPublications.items.length ? <DiscoveryGrid publications={filteredPublications.items} savedIds={savedPublicationIds} canSave onSave={onSavePublication} /> : <div className="empty"><Compass size={30} /><strong>没有匹配的单条分享</strong></div>}</section>;
}

function DiscoveryGrid({ publications, savedIds, canSave, onSave }: { publications: Publication[]; savedIds: Set<string>; canSave: boolean; onSave: (publication: Publication) => void }) {
  return <div className="bookmark-grid discovery-grid">{publications.map((publication) => <article className="bookmark-card discovery-card" key={publication.id} tabIndex={0} aria-label={`打开共享书签 ${publication.title}`} onClick={(event) => handleBookmarkSurfaceClick(event, publication.url, () => {})} onKeyDown={(event) => handleBookmarkSurfaceKeyDown(event, publication.url, () => {})}><div className="card-top"><div className="favicon"><img src={publication.favicon} alt="" /></div><span className="shared-author">{publication.author.name}</span></div><a href={publication.url} target="_blank" rel="noreferrer"><h3>{publication.title}</h3><span className="domain">{publication.domain}<ArrowUpRight size={12} /></span></a><p>{publication.description || "分享者没有添加描述"}</p><div className="card-bottom"><span className="published-at">{new Date(publication.publishedAt).toLocaleDateString("zh-CN")}</span>{canSave && <button className="secondary-button save-shared" disabled={savedIds.has(publication.id)} onClick={() => onSave(publication)}><Plus size={14} />{savedIds.has(publication.id) ? "已保存" : "保存到我的书签"}</button>}</div></article>)}</div>;
}

function SharedCollectionGrid({ collections, savedIds, canSave, onSave }: { collections: SharedCollection[]; savedIds: Set<string>; canSave: boolean; onSave: (collection: SharedCollection) => void }) {
  return <div className="collection-grid">{collections.map((collection) => <article className="shared-collection-card" key={collection.id}><header><div><span className="shared-author">{collection.author.name}</span><h3>{collection.name}</h3></div><span className="collection-count">{collection.items.length} 条</span></header><p>{collection.description || "作者没有添加合集描述"}</p><div className="collection-preview">{collection.items.slice(0, 4).map((item) => <a href={item.url} target="_blank" rel="noreferrer" key={item.id}><img src={item.favicon} alt="" /><span>{item.title}</span><ArrowUpRight size={12} /></a>)}</div><footer><span>{new Date(collection.updatedAt).toLocaleDateString("zh-CN")} 更新</span>{canSave && <button className="primary-button" disabled={savedIds.has(collection.id)} onClick={() => onSave(collection)}><Plus size={14} />{savedIds.has(collection.id) ? "已保存" : "保存整个合集"}</button>}</footer></article>)}</div>;
}
