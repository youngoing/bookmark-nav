"use client";

import { useEffect, useState } from "react";
import { Archive, ArrowUpRight, BarChart3, Bookmark, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, Command, Folder, LayoutGrid, Link2, List, LogIn, LogOut, Menu, Monitor, Moon, Pencil, Plus, Search, Settings2, SlidersHorizontal, Star, Sun, Table2, Tag, X } from "lucide-react";
import type { Bookmark as BookmarkType, DashboardData } from "../lib/types";
import { bookmarkPageResponse, bookmarkResponse, dashboardResponse, folderResponse, fromPromise, sessionResponse, tagResponse, type BookmarkPageResponse, type Folder as FolderType, type JsonValue, type Tag as TagType, type UserResponse } from "@loomark/shared";
import { useTheme, type ThemeMode } from "./theme-provider";

const initial: DashboardData = { bookmarks: [], folders: [], tags: [], totalClicks: 0 };
const tagColor = (id: string, tags: DashboardData["tags"]) => tags.find((tag) => tag.id === id)?.color || "#94a3b8";

function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return globalThis.fetch(input, { ...init, credentials: "include" });
}


export default function Home() {
  const { mode, setMode } = useTheme();
  const [user, setUser] = useState<UserResponse | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [data, setData] = useState(initial);
  const [activeFolder, setActiveFolder] = useState("all");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"all" | "recent" | "favorites">("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"recent" | "clicks" | "az">("recent");
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<BookmarkType | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [folderEditor, setFolderEditor] = useState<FolderType | "new" | null>(null);
  const [tagEditor, setTagEditor] = useState<TagType | "new" | null>(null);
  const [tagManageMode, setTagManageMode] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<"grid" | "list" | "table">("grid");
  const [pageInfo, setPageInfo] = useState<BookmarkPageResponse>({ items: [], page: 1, pageSize: 9, total: 0, totalPages: 0 });
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());

  async function loadSession(): Promise<void> {
    const responseResult = await fromPromise(apiFetch("/api/auth/session", { cache: "no-store" }), () => ({ code: "NETWORK_ERROR", message: "无法连接到服务器" }));
    if (!responseResult.ok) { setAuthLoading(false); return; }
    const bodyResult = await fromPromise(responseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }));
    if (responseResult.value.ok && bodyResult.ok) {
      const parsed = sessionResponse.safeParse(bodyResult.value);
      if (parsed.success) setUser(parsed.data.user);
    }
    setAuthLoading(false);
  }

  async function refreshDashboard() {
    const responseResult = await fromPromise(apiFetch("/api/v1/dashboard", { cache: "no-store" }), () => ({ code: "NETWORK_ERROR", message: "无法连接到服务器" }));
    if (!responseResult.ok) { setLoading(false); return; }
    const bodyResult = await fromPromise(responseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }));
    if (bodyResult.ok) {
      const parsed = dashboardResponse.safeParse(bodyResult.value);
      if (responseResult.value.ok && parsed.success) setData(parsed.data);
    }
    setLoading(false);
  }

  useEffect(() => { void loadSession(); }, []);
  useEffect(() => { if (user) void refreshDashboard(); }, [user]);
  useEffect(() => {
    const saved = window.localStorage.getItem("loomark-favorite-bookmarks");
    if (saved) setFavoriteIds(new Set(saved.split(",").filter(Boolean)));
  }, []);

  async function loadPage(page: number): Promise<void> {
    setPageLoading(true);
    setPageError(null);
    const params = new URLSearchParams({ page: String(page), pageSize: activeView === "favorites" ? "50" : "9", sort: activeView === "recent" ? "recent" : sort });
    if (activeFolder !== "all") params.set("folderId", activeFolder);
    if (activeTag) params.set("tagId", activeTag);
    if (query.trim()) params.set("q", query.trim());
    const responseResult = await fromPromise(apiFetch(`/api/v1/bookmarks/page?${params.toString()}`, { cache: "no-store" }), () => ({ code: "NETWORK_ERROR", message: "无法连接到服务器" }));
    if (!responseResult.ok) {
      setPageInfo({ items: [], page: 1, pageSize: 9, total: 0, totalPages: 0 });
      setPageError(responseResult.error.message);
      setPageLoading(false);
      return;
    }
    const bodyResult = await fromPromise(responseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }));
    if (!bodyResult.ok) {
      setPageInfo({ items: [], page: 1, pageSize: 9, total: 0, totalPages: 0 });
      setPageError(bodyResult.error.message);
      setPageLoading(false);
      return;
    }
    const parsed = bookmarkPageResponse.safeParse(bodyResult.value);
    if (!responseResult.value.ok || !parsed.success) {
      setPageInfo({ items: [], page: 1, pageSize: 9, total: 0, totalPages: 0 });
      setPageError("服务器返回了无法识别的书签数据");
      setPageLoading(false);
      return;
    }
    const result = parsed.data;
    if (activeView === "favorites") {
      const items = result.items.filter((bookmark) => favoriteIds.has(bookmark.id));
      setPageInfo({ items, page: 1, pageSize: result.pageSize, total: items.length, totalPages: items.length ? 1 : 0 });
    } else {
      setPageInfo(result);
    }
    setPageLoading(false);
  }

  useEffect(() => { if (user) void loadPage(1); }, [activeFolder, activeTag, activeView, query, sort, favoriteIds, user]);

  const visible = pageInfo.items;
  const folderName = activeView === "recent" ? "最近添加" : activeView === "favorites" ? "我的收藏" : data.folders.find((folder) => folder.id === activeFolder)?.name || "全部书签";

  function handleAdd(bookmark: BookmarkType) { void refreshDashboard(); setShowAdd(false); setActiveView("all"); setActiveFolder(bookmark.folderId); void loadPage(1); }
  async function clickBookmark(bookmark: BookmarkType): Promise<void> {
    const responseResult = await fromPromise(
      apiFetch(`/api/v1/bookmarks/${bookmark.id}/click`, { method: "POST" }),
      () => ({ code: "NETWORK_ERROR", message: "无法更新访问次数" }),
    );
    if (!responseResult.ok) return;

    const bodyResult = await fromPromise(
      responseResult.value.json() as Promise<JsonValue>,
      () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }),
    );
    if (!responseResult.value.ok || !bodyResult.ok) return;

    const parsed = bookmarkResponse.safeParse(bodyResult.value);
    if (!parsed.success) return;
    const updatedBookmark = parsed.data;

    setPageInfo((current) => ({
      ...current,
      items: current.items.map((item) => item.id === updatedBookmark.id ? updatedBookmark : item),
    }));
    setData((current) => {
      const previous = current.bookmarks.find((item) => item.id === updatedBookmark.id);
      const clickDelta = previous ? updatedBookmark.clicks - previous.clicks : 0;
      return {
        ...current,
        bookmarks: current.bookmarks.map((item) => item.id === updatedBookmark.id ? updatedBookmark : item),
        totalClicks: Math.max(0, current.totalClicks + clickDelta),
      };
    });
    void refreshDashboard();
  }
  async function deleteTag(tag: TagType): Promise<void> {
    const responseResult = await fromPromise(apiFetch(`/api/v1/tags/${tag.id}`, { method: "DELETE" }), () => ({ code: "NETWORK_ERROR", message: "无法删除标签" }));
    if (!responseResult.ok) return;
    const bodyResult = await fromPromise(responseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }));
    if (!responseResult.value.ok || !bodyResult.ok || !tagResponse.safeParse(bodyResult.value).success) return;
    setActiveTag((current) => current === tag.id ? null : current);
    void refreshDashboard();
  }
  async function deleteBookmark(bookmark: BookmarkType): Promise<void> {
    if (!window.confirm(`确定删除“${bookmark.title}”吗？`)) return;
    const responseResult = await fromPromise(apiFetch(`/api/v1/bookmarks/${bookmark.id}`, { method: "DELETE" }), () => ({ code: "NETWORK_ERROR", message: "无法删除书签" }));
    if (!responseResult.ok) return;
    const bodyResult = await fromPromise(responseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }));
    if (!responseResult.value.ok || !bodyResult.ok || typeof bodyResult.value !== "object" || bodyResult.value === null || Array.isArray(bodyResult.value) || !("deleted" in bodyResult.value) || bodyResult.value.deleted !== true) return;
    setEditingBookmark(null);
    void refreshDashboard();
    void loadPage(pageInfo.page);
  }
  function toggleFavorite(bookmark: BookmarkType) {
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (next.has(bookmark.id)) next.delete(bookmark.id); else next.add(bookmark.id);
      window.localStorage.setItem("loomark-favorite-bookmarks", [...next].join(","));
      return next;
    });
  }

  async function logout(): Promise<void> {
    const result = await fromPromise(apiFetch("/api/auth/logout", { method: "POST" }), () => ({ code: "NETWORK_ERROR", message: "无法退出登录" }));
    if (result.ok) { setUser(null); setShowMenu(false); setData(initial); setPageInfo({ items: [], page: 1, pageSize: 9, total: 0, totalPages: 0 }); }
  }

  if (authLoading) return <div className="auth-shell"><div className="auth-status">正在检查登录状态...</div></div>;
  if (!user) return <LoginScreen onLoggedIn={setUser} />;

  return <div className="shell">
    <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
      <div className="brand"><span className="brand-mark"><Command size={17} strokeWidth={2.8} /></span><span>Loomark</span><button className="icon-button sidebar-close" onClick={() => setMobileNav(false)}><X size={18} /></button></div>
      <div className="profile"><div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div><div><strong>{user.name}</strong><span>{user.email}</span></div><ChevronDown size={15} className="muted" /></div>
      <nav className="nav"><p className="nav-label">工作台</p><button className={`nav-item ${activeView === "all" && activeFolder === "all" && !activeTag ? "selected" : ""}`} onClick={() => { setActiveView("all"); setActiveFolder("all"); setActiveTag(null); setMobileNav(false); }}><LayoutGrid size={17} />总览<span className="nav-count">{data.bookmarks.length}</span></button><button className={`nav-item ${activeView === "recent" ? "selected" : ""}`} onClick={() => { setActiveView("recent"); setActiveFolder("all"); setActiveTag(null); setSort("recent"); setMobileNav(false); }}><Clock3 size={17} />最近添加</button><button className={`nav-item ${activeView === "favorites" ? "selected" : ""}`} onClick={() => { setActiveView("favorites"); setActiveFolder("all"); setActiveTag(null); setMobileNav(false); }}><Star size={17} />我的收藏<span className="nav-count">{favoriteIds.size}</span></button><p className="nav-label folder-label">目录 <button className="tiny-add" onClick={() => setFolderEditor("new")} title="创建目录" aria-label="创建目录"><Plus size={14} /></button></p>{data.folders.filter((folder) => folder.id !== "all").map((folder) => <div className="nav-manage-row" key={folder.id}><button className={`nav-item ${activeView === "all" && activeFolder === folder.id ? "selected" : ""}`} onClick={() => { setActiveView("all"); setActiveFolder(folder.id); setActiveTag(null); setMobileNav(false); }}><span className="folder-icon">{folder.icon}</span>{folder.name}<span className="nav-count">{folder.count}</span></button><button className="nav-edit" onClick={() => setFolderEditor(folder)} title={`编辑${folder.name}`} aria-label={`编辑${folder.name}`}><Pencil size={13} /></button></div>)}<p className="nav-label tag-label">标签 <button className="tiny-add" onClick={() => setTagEditor("new")} title="创建标签" aria-label="创建标签"><Plus size={14} /></button></p><div className="tag-cloud">{data.tags.map((tag) => <div className="nav-manage-row" key={tag.id}><button className={`tag-filter ${activeTag === tag.id ? "active" : ""}`} onClick={() => { setActiveView("all"); setActiveTag(activeTag === tag.id ? null : tag.id); setActiveFolder("all"); setMobileNav(false); }}><span className="tag-dot" style={{ background: tag.color }} />{tag.name}<span>{tag.count}</span></button><button className="nav-edit" onClick={() => setTagEditor(tag)} title={`编辑${tag.name}`} aria-label={`编辑${tag.name}`}><Pencil size={13} /></button></div>)}</div></nav>
      <TagManagementPanel tags={data.tags} activeTag={activeTag} editMode={tagManageMode} onToggleEdit={() => setTagManageMode((current) => !current)} onCreate={() => setTagEditor("new")} onEdit={setTagEditor} onDelete={(tag) => void deleteTag(tag)} onSelect={(tag) => { setActiveView("all"); setActiveTag(activeTag === tag.id ? null : tag.id); setActiveFolder("all"); setMobileNav(false); }} />
      <div className="sidebar-bottom"><ThemeSwitcher mode={mode} setMode={setMode} /><button className="nav-item" onClick={() => setShowAccount(true)}><Settings2 size={17} />账号设置</button><button className="nav-item"><CircleHelp size={17} />帮助中心</button></div>
    </aside>
    {mobileNav && <button className="backdrop" onClick={() => setMobileNav(false)} aria-label="关闭导航" />}
    <main className="main">
      <header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMobileNav(true)}><Menu size={20} /></button><div className="breadcrumbs"><span>工作台</span><span>/</span><strong>{folderName}</strong>{activeTag && <><span>/</span><strong className="crumb-tag">#{data.tags.find((tag) => tag.id === activeTag)?.name}</strong></>}</div><div className="top-actions"><div className="top-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索书签..." /><kbd>⌘ K</kbd></div><button className="icon-button"><BarChart3 size={18} /></button><div className="menu-wrap"><button className="avatar mini" onClick={() => setShowMenu(!showMenu)}>{user.name.slice(0, 1).toUpperCase()}</button>{showMenu && <div className="user-menu"><strong>{user.name}</strong><span>{user.email}</span><hr /><button onClick={() => { setShowAccount(true); setShowMenu(false); }}><Settings2 size={15} />账号设置</button><button onClick={() => void logout()}><LogOut size={15} />退出登录</button></div>}</div></div></header>
      <section className="content"><div className="welcome"><div><p className="eyebrow">星期一，12 月 16 日</p><h1>你的数字空间。</h1><p className="subline">把值得收藏的一切，整理在触手可及的地方。</p></div><div className="welcome-actions"><button className="secondary-button" disabled={!visible.length} onClick={() => setShowEdit((current) => !current)} title={showEdit ? "完成当前页面编辑" : "编辑当前页面书签"}>{showEdit ? <><Check size={16} />完成编辑</> : <><Pencil size={16} />编辑书签</>}</button><button className="primary-button" onClick={() => setShowAdd(true)}><Plus size={17} />添加书签</button></div></div>
        {loading ? <StatsSkeleton /> : <div className="stats"><div className="stat-card"><div className="stat-icon blue"><Bookmark size={18} /></div><div><span>书签总数</span><strong>{data.bookmarks.length}</strong><small><i className="up">+12.5%</i> 较上月</small></div></div><div className="stat-card"><div className="stat-icon orange"><Folder size={18} /></div><div><span>目录</span><strong>{Math.max(data.folders.length - 1, 0)}</strong><small>保持井井有条</small></div></div><div className="stat-card"><div className="stat-icon purple"><Tag size={18} /></div><div><span>标签</span><strong>{data.tags.length}</strong><small>多维度组织内容</small></div></div><div className="stat-card"><div className="stat-icon green"><BarChart3 size={18} /></div><div><span>总访问次数</span><strong>{data.totalClicks.toLocaleString()}</strong><small><i className="up">+8.2%</i> 较上月</small></div></div></div>}
        <div className="section-heading"><div><h2>{activeTag ? `#${data.tags.find((tag) => tag.id === activeTag)?.name}` : folderName}</h2><span>{pageInfo.total} 个书签</span></div><div className="view-actions"><div className="sort-wrap"><SlidersHorizontal size={15} /><select value={activeView === "recent" ? "recent" : sort} disabled={activeView === "recent"} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="recent">最近添加</option><option value="clicks">访问最多</option><option value="az">名称排序</option></select></div><div className="display-toggle" aria-label="展示方式"><button className={displayMode === "grid" ? "active" : ""} onClick={() => setDisplayMode("grid")} title="大图展示" aria-label="大图展示"><LayoutGrid size={16} /></button><button className={displayMode === "list" ? "active" : ""} onClick={() => setDisplayMode("list")} title="列表展示" aria-label="列表展示"><List size={16} /></button><button className={displayMode === "table" ? "active" : ""} onClick={() => setDisplayMode("table")} title="表格展示" aria-label="表格展示"><Table2 size={16} /></button></div><button className="icon-button" onClick={() => setShowAdd(true)} title="添加书签" aria-label="添加书签"><Plus size={18} /></button></div></div>
        {showEdit ? <BookmarkEditMode bookmarks={visible} onEdit={setEditingBookmark} onDelete={(bookmark) => void deleteBookmark(bookmark)} /> : loading || pageLoading ? <LoadingState /> : pageError ? <div className="empty"><Archive size={30} /><strong>书签加载失败</strong><span>{pageError}</span><button className="secondary-button" onClick={() => void loadPage(pageInfo.page)}>重新加载</button></div> : visible.length ? <>
          {displayMode === "grid" && <div className="bookmark-grid" role="list" aria-label="大图书签">{visible.map((bookmark) => <BookmarkCard key={bookmark.id} bookmark={bookmark} tags={data.tags} isFavorite={favoriteIds.has(bookmark.id)} onFavorite={() => toggleFavorite(bookmark)} onClick={() => clickBookmark(bookmark)} />)}</div>}
          {displayMode === "list" && <div className="bookmark-list" role="list" aria-label="列表书签">{visible.map((bookmark) => <BookmarkListRow key={bookmark.id} bookmark={bookmark} tags={data.tags} isFavorite={favoriteIds.has(bookmark.id)} onFavorite={() => toggleFavorite(bookmark)} onClick={() => clickBookmark(bookmark)} />)}</div>}
          {displayMode === "table" && <BookmarkTable bookmarks={visible} folders={data.folders} tags={data.tags} favoriteIds={favoriteIds} onFavorite={toggleFavorite} onClick={clickBookmark} />}
          {pageInfo.totalPages > 0 && <div className="pagination"><span>第 {pageInfo.page} / {pageInfo.totalPages} 页，共 {pageInfo.total} 个</span><div><button className="icon-button" disabled={pageLoading || pageInfo.page <= 1} onClick={() => void loadPage(pageInfo.page - 1)} title="上一页" aria-label="上一页"><ChevronLeft size={17} /></button><button className="icon-button" disabled={pageLoading || pageInfo.page >= pageInfo.totalPages} onClick={() => void loadPage(pageInfo.page + 1)} title="下一页" aria-label="下一页"><ChevronRight size={17} /></button></div></div>}
        </> : <div className="empty"><Archive size={30} /><strong>{activeView === "favorites" ? "还没有收藏的书签" : "还没有匹配的书签"}</strong><span>{activeView === "favorites" ? "点击书签卡片右上角的星标即可收藏" : "试试其他关键词或添加一个新书签"}</span><button className="primary-button" onClick={() => setShowAdd(true)}><Plus size={16} />添加书签</button></div>}
        <footer><span>已同步 · 刚刚</span><span><Link2 size={13} /> API 已就绪</span></footer>
      </section>
    </main>
    {showAdd && <AddBookmarkModal folders={data.folders.filter((folder) => folder.id !== "all")} tags={data.tags} onClose={() => setShowAdd(false)} onAdded={handleAdd} />}
    {editingBookmark && <EditBookmarkModal bookmarks={[editingBookmark]} folders={data.folders.filter((folder) => folder.id !== "all")} tags={data.tags} onClose={() => setEditingBookmark(null)} onSaved={(updated) => { setEditingBookmark(null); setPageInfo((current) => ({ ...current, items: current.items.map((item) => item.id === updated.id ? updated : item) })); setData((current) => ({ ...current, bookmarks: current.bookmarks.map((item) => item.id === updated.id ? updated : item) })); void refreshDashboard(); }} />}
    {showAccount && <AccountModal user={user} onClose={() => setShowAccount(false)} onSaved={(updated) => { setUser(updated); setShowAccount(false); }} />}
    {folderEditor && <FolderModal folder={folderEditor === "new" ? null : folderEditor} onClose={() => setFolderEditor(null)} onSaved={() => { setFolderEditor(null); void refreshDashboard(); }} />}
    {tagEditor && <TagModal tag={tagEditor === "new" ? null : tagEditor} onClose={() => setTagEditor(null)} onSaved={() => { setTagEditor(null); void refreshDashboard(); }} />}
  </div>;
}

function StatsSkeleton() {
  return <div className="stats" aria-label="正在加载统计数据" aria-busy="true">{["blue", "orange", "purple", "green"].map((color) => <div className="stat-card skeleton-card" key={color}><div className={`stat-icon ${color} skeleton-block`} /><div className="skeleton-stat-copy"><span className="skeleton-line short" /><strong className="skeleton-line medium" /><small className="skeleton-line long" /></div></div>)}</div>;
}

function LoadingState() {
  return <div className="loading-state" aria-label="正在加载书签" aria-busy="true"><div className="loading-toolbar"><span className="skeleton-line medium" /><span className="skeleton-line short" /></div><div className="loading-grid">{["one", "two", "three", "four", "five", "six"].map((key) => <div className="bookmark-card skeleton-bookmark" key={key}><span className="skeleton-block skeleton-favicon" /><span className="skeleton-line medium" /><span className="skeleton-line long" /><span className="skeleton-line paragraph" /><div className="skeleton-footer"><span className="skeleton-line tag" /><span className="skeleton-line tiny" /></div></div>)}</div></div>;
}

function TagManagementPanel({ tags, activeTag, editMode, onToggleEdit, onCreate, onEdit, onDelete, onSelect }: { tags: TagType[]; activeTag: string | null; editMode: boolean; onToggleEdit: () => void; onCreate: () => void; onEdit: (tag: TagType) => void; onDelete: (tag: TagType) => void; onSelect: (tag: TagType) => void }) {
  return <section className="tag-management-panel" aria-label="标签管理"><div className="tag-management-header"><span className="nav-label">标签</span><span className="tag-label-actions"><button className="tiny-add" onClick={onCreate} title="创建标签" aria-label="创建标签"><Plus size={14} /></button><button className={`tag-manage-toggle ${editMode ? "active" : ""}`} onClick={onToggleEdit} title={editMode ? "完成标签编辑" : "编辑标签"} aria-label={editMode ? "完成标签编辑" : "编辑标签"}>{editMode ? <Check size={14} /> : <Pencil size={13} />}</button></span></div><div className="tag-cloud">{tags.map((tag) => <div className="tag-management-row" key={tag.id}><button disabled={editMode} className={`tag-filter ${activeTag === tag.id ? "active" : ""}`} onClick={() => onSelect(tag)}><span className="tag-dot" style={{ background: tag.color }} />{tag.name}<span>{tag.count}</span></button>{editMode && <span className="tag-action-badges"><button className="tag-action-edit" onClick={() => onEdit(tag)} title={`编辑${tag.name}`} aria-label={`编辑${tag.name}`}><Pencil size={13} /></button><button className="tag-action-delete" onClick={() => onDelete(tag)} title={`删除${tag.name}`} aria-label={`删除${tag.name}`}><X size={13} /></button></span>}</div>)}</div></section>;
}

type BookmarkDraft = { id: string; title: string; description: string; folderId: string; tags: string[] };

function BookmarkInlineEditMode({ bookmarks, folders, tags, onSaved }: { bookmarks: BookmarkType[]; folders: DashboardData["folders"]; tags: DashboardData["tags"]; onSaved: (bookmark: BookmarkType) => void }) {
  const [drafts, setDrafts] = useState<BookmarkDraft[]>(() => bookmarks.map((bookmark) => ({ id: bookmark.id, title: bookmark.title, description: bookmark.description, folderId: bookmark.folderId, tags: bookmark.tags })));
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDrafts(bookmarks.map((bookmark) => ({ id: bookmark.id, title: bookmark.title, description: bookmark.description, folderId: bookmark.folderId, tags: bookmark.tags })));
  }, [bookmarks]);

  function updateDraft(id: string, update: (draft: BookmarkDraft) => BookmarkDraft): void {
    setDrafts((current) => current.map((draft) => draft.id === id ? update(draft) : draft));
  }

  async function saveDraft(draft: BookmarkDraft): Promise<void> {
    setSavingId(draft.id); setError(null);
    const responseResult = await fromPromise(apiFetch(`/api/v1/bookmarks/${draft.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: draft.title, description: draft.description, folderId: draft.folderId, tags: draft.tags }) }), () => ({ code: "NETWORK_ERROR", message: "无法保存书签" }));
    if (!responseResult.ok) { setError(responseResult.error.message); setSavingId(null); return; }
    const bodyResult = await fromPromise(responseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }));
    const parsed = bodyResult.ok ? bookmarkResponse.safeParse(bodyResult.value) : null;
    if (!responseResult.value.ok || !parsed?.success) { setError("书签保存失败"); setSavingId(null); return; }
    onSaved(parsed.data); setSavingId(null);
  }

  return <div className="bookmark-edit-mode" role="group" aria-label="当前页面书签编辑模式"><div className="edit-mode-hint"><Pencil size={15} /><span>当前页面的 {drafts.length} 个书签均可编辑</span></div>{drafts.map((draft) => { const bookmark = bookmarks.find((item) => item.id === draft.id); if (!bookmark) return null; return <article className="bookmark-inline-editor" key={draft.id}><div className="inline-editor-heading"><div className="favicon"><img src={bookmark.favicon} alt="" /></div><div><strong>{bookmark.title}</strong><span>{bookmark.domain}</span></div></div><div className="inline-editor-fields"><label>标题<input value={draft.title} onChange={(event) => updateDraft(draft.id, (current) => ({ ...current, title: event.target.value }))} maxLength={120} required /></label><label>描述<textarea value={draft.description} onChange={(event) => updateDraft(draft.id, (current) => ({ ...current, description: event.target.value }))} rows={2} maxLength={500} /></label><label>目录<select value={draft.folderId} onChange={(event) => updateDraft(draft.id, (current) => ({ ...current, folderId: event.target.value }))}>{folders.map((folder) => <option value={folder.id} key={folder.id}>{folder.name}</option>)}</select></label></div><div className="inline-editor-tags"><span>标签</span><div>{tags.map((tag) => <button type="button" key={tag.id} className={draft.tags.includes(tag.id) ? "picked" : ""} aria-pressed={draft.tags.includes(tag.id)} onClick={() => updateDraft(draft.id, (current) => ({ ...current, tags: current.tags.includes(tag.id) ? current.tags.filter((id) => id !== tag.id) : [...current.tags, tag.id] }))}><span className="tag-dot" style={{ background: tag.color }} />{tag.name}</button>)}</div></div><div className="inline-editor-actions"><span className="inline-editor-url">{bookmark.url}</span><button className="primary-button" disabled={savingId === draft.id} onClick={() => void saveDraft(draft)}>{savingId === draft.id ? "保存中..." : "保存此书签"}</button></div></article>; })}{error && <p className="form-error" role="alert">{error}</p>}</div>;
}

function BookmarkEditMode({ bookmarks, onEdit, onDelete }: { bookmarks: BookmarkType[]; onEdit: (bookmark: BookmarkType) => void; onDelete: (bookmark: BookmarkType) => void }) {
  return <div className="bookmark-edit-mode" role="group" aria-label="当前页面书签编辑模式"><div className="edit-mode-hint"><Pencil size={15} /><span>编辑模式：每条书签都可以单独编辑或删除</span></div><div className="bookmark-edit-grid">{bookmarks.map((bookmark) => <article className="bookmark-edit-item" key={bookmark.id}><div className="inline-editor-heading"><div className="favicon"><img src={bookmark.favicon} alt="" /></div><div><strong>{bookmark.title}</strong><span>{bookmark.domain}</span></div></div><div className="bookmark-edit-badges"><button className="tag-action-edit" onClick={() => onEdit(bookmark)} title={`编辑${bookmark.title}`} aria-label={`编辑${bookmark.title}`}><Pencil size={14} /></button><button className="tag-action-delete" onClick={() => onDelete(bookmark)} title={`删除${bookmark.title}`} aria-label={`删除${bookmark.title}`}><X size={14} /></button></div></article>)}</div></div>;
}

function ThemeSwitcher({ mode, setMode }: { mode: ThemeMode; setMode: (mode: ThemeMode) => void }) {
  const options: readonly { value: ThemeMode; label: string; icon: typeof Sun }[] = [{ value: "system", label: "跟随系统", icon: Monitor }, { value: "light", label: "浅色主题", icon: Sun }, { value: "dark", label: "深色主题", icon: Moon }];
  return <div className="theme-switcher" aria-label="主题设置">{options.map(({ value, label, icon: Icon }) => <button key={value} className={mode === value ? "active" : ""} onClick={() => setMode(value)} title={label} aria-label={label}><Icon size={14} /></button>)}</div>;
}

function LoginScreen({ onLoggedIn }: { onLoggedIn: (user: UserResponse) => void }) {
  const [email, setEmail] = useState("test@bookmark-nav.local");
  const [password, setPassword] = useState("Test123456!");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const responseResult = await fromPromise(apiFetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) }), () => ({ code: "NETWORK_ERROR", message: "无法连接到服务器" }));
    if (!responseResult.ok) { setError(responseResult.error.message); setSubmitting(false); return; }
    const bodyResult = await fromPromise(responseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }));
    if (!responseResult.value.ok || !bodyResult.ok) { setError(bodyResult.ok && typeof bodyResult.value === "object" && bodyResult.value !== null && "error" in bodyResult.value && typeof bodyResult.value.error === "string" ? bodyResult.value.error : "邮箱或密码不正确"); setSubmitting(false); return; }
    const parsed = sessionResponse.safeParse(bodyResult.value);
    if (!parsed.success) { setError("服务器返回无效账号信息"); setSubmitting(false); return; }
    onLoggedIn(parsed.data.user);
    setSubmitting(false);
  }
  return <main className="auth-shell"><form className="auth-panel" onSubmit={(event) => void submit(event)}><div className="auth-brand"><span className="brand-mark"><Command size={18} strokeWidth={2.8} /></span><strong>Loomark</strong></div><div><p className="eyebrow">个人工作区</p><h1>登录</h1><p>使用已初始化的账号进入书签工作台。</p></div><label>邮箱<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label><label>密码<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" minLength={8} required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button auth-submit" disabled={submitting}><LogIn size={16} />{submitting ? "登录中..." : "登录"}</button><small>测试账号已预填，可直接登录。</small></form></main>;
}

function AccountModal({ user, onClose, onSaved }: { user: UserResponse; onClose: () => void; onSaved: (user: UserResponse) => void }) {
  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault(); setSaving(true); setError("");
    const responseResult = await fromPromise(apiFetch("/api/v1/account", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, currentPassword: currentPassword || undefined, newPassword: newPassword || undefined }) }), () => ({ code: "NETWORK_ERROR", message: "无法连接到服务器" }));
    if (!responseResult.ok) { setError(responseResult.error.message); setSaving(false); return; }
    const bodyResult = await fromPromise(responseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }));
    const parsed = bodyResult.ok ? sessionResponse.safeParse(bodyResult.value) : null;
    if (!responseResult.value.ok || !parsed?.success) { setError(bodyResult.ok && typeof bodyResult.value === "object" && bodyResult.value !== null && "error" in bodyResult.value && typeof bodyResult.value.error === "string" ? bodyResult.value.error : "账号设置保存失败"); setSaving(false); return; }
    onSaved(parsed.data.user); setSaving(false);
  }
  return <div className="modal-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="modal compact-modal" onSubmit={(event) => void submit(event)}><div className="modal-header"><div><p className="eyebrow">当前账号</p><h2>账号设置</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="关闭"><X size={18} /></button></div><label>邮箱<input value={user.email} disabled /></label><label>显示名称<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={60} /></label><div className="form-divider">修改密码（可选）</div><label>当前密码<input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" /></label><label>新密码<input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={8} /></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" disabled={saving}>{saving ? "保存中..." : "保存设置"}</button></div></form></div>;
}

function FolderModal({ folder, onClose, onSaved }: { folder: FolderType | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(folder?.name || "");
  const [icon, setIcon] = useState(folder?.icon || "◈");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault(); setSaving(true); setError("");
    const responseResult = await fromPromise(apiFetch(folder ? `/api/v1/folders/${folder.id}` : "/api/v1/folders", { method: folder ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, icon }) }), () => ({ code: "NETWORK_ERROR", message: "无法连接到服务器" }));
    if (!responseResult.ok) { setError(responseResult.error.message); setSaving(false); return; }
    const bodyResult = await fromPromise(responseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }));
    const parsed = bodyResult.ok ? folderResponse.safeParse(bodyResult.value) : null;
    if (!responseResult.value.ok || !parsed?.success) { setError(bodyResult.ok && typeof bodyResult.value === "object" && bodyResult.value !== null && "error" in bodyResult.value && typeof bodyResult.value.error === "string" ? bodyResult.value.error : "目录保存失败"); setSaving(false); return; }
    onSaved(); setSaving(false);
  }
  return <div className="modal-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="modal compact-modal" onSubmit={(event) => void submit(event)}><div className="modal-header"><div><p className="eyebrow">目录管理</p><h2>{folder ? "编辑目录" : "创建目录"}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="关闭"><X size={18} /></button></div><div className="folder-form"><label>图标<input value={icon} onChange={(event) => setIcon(event.target.value)} maxLength={8} required /></label><label>名称<input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} required autoFocus /></label></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" disabled={saving}>{saving ? "保存中..." : "保存目录"}</button></div></form></div>;
}

function TagModal({ tag, onClose, onSaved }: { tag: TagType | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(tag?.name || "");
  const [color, setColor] = useState(tag?.color || "#536dfe");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault(); setSaving(true); setError("");
    const responseResult = await fromPromise(apiFetch(tag ? `/api/v1/tags/${tag.id}` : "/api/v1/tags", { method: tag ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, color }) }), () => ({ code: "NETWORK_ERROR", message: "无法连接到服务器" }));
    if (!responseResult.ok) { setError(responseResult.error.message); setSaving(false); return; }
    const bodyResult = await fromPromise(responseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }));
    const parsed = bodyResult.ok ? tagResponse.safeParse(bodyResult.value) : null;
    if (!responseResult.value.ok || !parsed?.success) { setError(bodyResult.ok && typeof bodyResult.value === "object" && bodyResult.value !== null && "error" in bodyResult.value && typeof bodyResult.value.error === "string" ? bodyResult.value.error : "标签保存失败"); setSaving(false); return; }
    onSaved(); setSaving(false);
  }
  return <div className="modal-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="modal compact-modal" onSubmit={(event) => void submit(event)}><div className="modal-header"><div><p className="eyebrow">标签管理</p><h2>{tag ? "编辑标签" : "创建标签"}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="关闭"><X size={18} /></button></div><label>名称<input value={name} onChange={(event) => setName(event.target.value)} maxLength={30} required autoFocus /></label><label>颜色<div className="color-field"><input type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="标签颜色" /><input value={color} onChange={(event) => setColor(event.target.value)} pattern="#[0-9a-fA-F]{6}" required /></div></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" disabled={saving}>{saving ? "保存中..." : "保存标签"}</button></div></form></div>;
}

function BookmarkCard({ bookmark, tags, isFavorite, onFavorite, onClick }: { bookmark: BookmarkType; tags: DashboardData["tags"]; isFavorite: boolean; onFavorite: () => void; onClick: () => void }) { return <article className="bookmark-card" role="listitem"><div className="card-top"><div className="favicon"><img src={bookmark.favicon} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /></div><button type="button" className={`more-button ${isFavorite ? "favorite-active" : ""}`} aria-label={isFavorite ? "取消收藏" : "收藏书签"} title={isFavorite ? "取消收藏" : "收藏书签"} onClick={onFavorite}><Star size={18} fill={isFavorite ? "currentColor" : "none"} /></button></div><a href={bookmark.url} target="_blank" rel="noreferrer" onClick={onClick}><h3>{bookmark.title}</h3><span className="domain">{bookmark.domain}<ArrowUpRight size={12} /></span></a><p>{bookmark.description}</p><div className="card-bottom"><div className="card-tags">{bookmark.tags.map((id) => <span key={id} style={{ "--tag-color": tagColor(id, tags) } as React.CSSProperties}>#{tags.find((tag) => tag.id === id)?.name}</span>)}</div><span className="clicks"><BarChart3 size={13} />{bookmark.clicks}</span></div></article>; }

function BookmarkListRow({ bookmark, tags, isFavorite, onFavorite, onClick }: { bookmark: BookmarkType; tags: DashboardData["tags"]; isFavorite: boolean; onFavorite: () => void; onClick: () => void }) {
  return <article className="bookmark-list-row" role="listitem"><div className="favicon"><img src={bookmark.favicon} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /></div><div className="list-main"><a href={bookmark.url} target="_blank" rel="noreferrer" onClick={onClick}><strong>{bookmark.title}</strong><span className="domain">{bookmark.domain}<ArrowUpRight size={12} /></span></a><p>{bookmark.description || "暂无描述"}</p></div><div className="list-tags">{bookmark.tags.map((id) => <span key={id} style={{ "--tag-color": tagColor(id, tags) } as React.CSSProperties}>#{tags.find((tag) => tag.id === id)?.name}</span>)}</div><span className="clicks"><BarChart3 size={13} />{bookmark.clicks}</span><button type="button" className={`more-button ${isFavorite ? "favorite-active" : ""}`} aria-label={isFavorite ? "取消收藏" : "收藏书签"} title={isFavorite ? "取消收藏" : "收藏书签"} onClick={onFavorite}><Star size={17} fill={isFavorite ? "currentColor" : "none"} /></button></article>;
}

function BookmarkTable({ bookmarks, folders, tags, favoriteIds, onFavorite, onClick }: { bookmarks: BookmarkType[]; folders: DashboardData["folders"]; tags: DashboardData["tags"]; favoriteIds: Set<string>; onFavorite: (bookmark: BookmarkType) => void; onClick: (bookmark: BookmarkType) => void }) {
  return <div className="bookmark-table-wrap"><table className="bookmark-table"><thead><tr><th>书签</th><th>目录</th><th>标签</th><th>访问</th><th>添加时间</th><th aria-label="操作" /></tr></thead><tbody>{bookmarks.map((bookmark) => <tr key={bookmark.id}><td><div className="table-title"><div className="favicon"><img src={bookmark.favicon} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /></div><a href={bookmark.url} target="_blank" rel="noreferrer" onClick={() => onClick(bookmark)}><strong>{bookmark.title}</strong><span>{bookmark.domain}</span></a></div></td><td>{folders.find((folder) => folder.id === bookmark.folderId)?.name || bookmark.folderId}</td><td><div className="list-tags">{bookmark.tags.map((id) => <span key={id} style={{ "--tag-color": tagColor(id, tags) } as React.CSSProperties}>#{tags.find((tag) => tag.id === id)?.name}</span>)}</div></td><td><span className="clicks"><BarChart3 size={13} />{bookmark.clicks}</span></td><td>{new Date(bookmark.createdAt).toLocaleDateString("zh-CN")}</td><td><button type="button" className={`more-button ${favoriteIds.has(bookmark.id) ? "favorite-active" : ""}`} aria-label={favoriteIds.has(bookmark.id) ? "取消收藏" : "收藏书签"} title={favoriteIds.has(bookmark.id) ? "取消收藏" : "收藏书签"} onClick={() => onFavorite(bookmark)}><Star size={16} fill={favoriteIds.has(bookmark.id) ? "currentColor" : "none"} /></button></td></tr>)}</tbody></table></div>;
}

function EditBookmarkModal({ bookmarks, folders, tags, onClose, onSaved }: { bookmarks: BookmarkType[]; folders: DashboardData["folders"]; tags: DashboardData["tags"]; onClose: () => void; onSaved: (bookmark: BookmarkType) => void }) {
  const [selectedId, setSelectedId] = useState(bookmarks[0]?.id || "");
  const bookmark = bookmarks.find((item) => item.id === selectedId);
  const [title, setTitle] = useState(bookmark?.title || "");
  const [description, setDescription] = useState(bookmark?.description || "");
  const [folderId, setFolderId] = useState(bookmark?.folderId || folders[0]?.id || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(bookmark?.tags || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bookmark) return;
    setTitle(bookmark.title); setDescription(bookmark.description); setFolderId(bookmark.folderId); setSelectedTags(bookmark.tags);
  }, [bookmark?.id]);

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!bookmark) return;
    setSaving(true); setError("");
    const responseResult = await fromPromise(apiFetch(`/api/v1/bookmarks/${bookmark.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, description, folderId, tags: selectedTags }) }), () => ({ code: "NETWORK_ERROR", message: "无法连接到服务器" }));
    if (!responseResult.ok) { setError(responseResult.error.message); setSaving(false); return; }
    const bodyResult = await fromPromise(responseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }));
    const parsed = bodyResult.ok ? bookmarkResponse.safeParse(bodyResult.value) : null;
    if (!responseResult.value.ok || !parsed?.success) { setError(bodyResult.ok && typeof bodyResult.value === "object" && bodyResult.value !== null && "error" in bodyResult.value && typeof bodyResult.value.error === "string" ? bodyResult.value.error : "书签保存失败"); setSaving(false); return; }
    onSaved(parsed.data); setSaving(false);
  }

  return <div className="modal-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="modal edit-bookmark-modal" onSubmit={(event) => void submit(event)}><div className="modal-header"><div><p className="eyebrow">当前页面</p><h2>编辑书签</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="关闭"><X size={18} /></button></div><label>选择书签<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{bookmarks.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>{bookmark && <><label>网址<input value={bookmark.url} disabled /></label><label>标题<input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={120} /></label><label>描述<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={500} /></label><label>目录<select value={folderId} onChange={(event) => setFolderId(event.target.value)}>{folders.map((folder) => <option value={folder.id} key={folder.id}>{folder.name}</option>)}</select></label><div className="tag-field"><span className="field-label">标签</span><div className="bookmark-tag-editor"><div className="selected-tag-list" aria-label="当前标签">{selectedTags.map((id) => { const tag = tags.find((item) => item.id === id); if (!tag) return null; return <span className="selected-tag-chip" key={tag.id} style={{ "--tag-color": tag.color } as React.CSSProperties}><span>#{tag.name}</span><span className="tag-chip-actions"><button type="button" aria-label={`移除标签${tag.name}`} title={`移除标签${tag.name}`} onClick={() => setSelectedTags((current) => current.filter((tagId) => tagId !== tag.id))}><X size={12} /></button></span></span>; })}{selectedTags.length === 0 && <span className="tag-empty">未添加标签</span>}</div><div className="tag-picker" aria-label="添加标签">{tags.filter((tag) => !selectedTags.includes(tag.id)).map((tag) => <button type="button" key={tag.id} onClick={() => setSelectedTags((current) => [...current, tag.id])}><span className="tag-dot" style={{ background: tag.color }} />{tag.name}<Plus size={13} /></button>)}</div></div></div></>}{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" disabled={saving}>{saving ? "保存中..." : "保存修改"}</button></div></form></div>;
}

function AddBookmarkModal({ folders, tags, onClose, onAdded }: { folders: DashboardData["folders"]; tags: DashboardData["tags"]; onClose: () => void; onAdded: (bookmark: BookmarkType) => void }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [folderId, setFolderId] = useState(folders[0]?.id || "dev");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    const request = apiFetch("/api/v1/bookmarks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, title: title || undefined, description, folderId, tags: selectedTags, isPublic: false }) });
    fromPromise(request, () => ({ code: "NETWORK_ERROR", message: "无法连接到服务器" })).then((responseResult) => {
      if (!responseResult.ok) return responseResult;
      return fromPromise(responseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" })).then((bodyResult) => {
        if (!bodyResult.ok) return bodyResult;
        const parsed = bookmarkResponse.safeParse(bodyResult.value);
        return parsed.success ? { ok: true as const, value: parsed.data } : { ok: false as const, error: { code: "INVALID_RESPONSE", message: "服务器返回无效书签" } };
      });
    }).then((result) => {
      if (result.ok) onAdded(result.value);
      else setError(result.error.message);
      setSaving(false);
    });
  };
  return <div className="modal-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="modal" onSubmit={submit}><div className="modal-header"><div><p className="eyebrow">新收藏</p><h2>添加一个书签</h2></div><button type="button" className="icon-button" onClick={onClose}><X size={18} /></button></div><label>网址<input required type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com" autoFocus /></label><label>标题<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="留空自动使用网站标题" /></label><label>描述<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="一句话记下它为什么值得收藏" rows={3} /></label><div className="form-row"><label>目录<select value={folderId} onChange={(event) => setFolderId(event.target.value)}>{folders.map((folder) => <option value={folder.id} key={folder.id}>{folder.name}</option>)}</select></label><label>可见性<select defaultValue="private"><option value="private">仅自己可见</option><option value="public">公开</option></select></label></div><label>标签<div className="tag-picker">{tags.map((tag) => <button type="button" key={tag.id} className={selectedTags.includes(tag.id) ? "picked" : ""} onClick={() => setSelectedTags((current) => current.includes(tag.id) ? current.filter((id) => id !== tag.id) : [...current, tag.id])}><span className="tag-dot" style={{ background: tag.color }} />{tag.name}{selectedTags.includes(tag.id) && <Check size={13} />}</button>)}</div></label>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" disabled={saving}>{saving ? "保存中..." : <><Plus size={16} />保存书签</>}</button></div></form></div>;
}
