"use client";

import { useEffect, useState } from "react";
import { Archive, ArrowUpRight, BarChart3, Bookmark, Check, ChevronLeft, ChevronRight, Clock3, Compass, Copy, Download, Globe2, KeyRound, LayoutGrid, Link2, List, LogOut, Menu, Monitor, Moon, Pencil, Plus, Search, Settings2, Share2, SlidersHorizontal, Star, Sun, Table2, Trash2, X } from "lucide-react";
import type { Bookmark as BookmarkType, DashboardData } from "../lib/types";
import { apiKeyCreatedResponse, apiKeyListResponse, bookmarkPageResponse, bookmarkResponse, dashboardResponse, folderResponse, fromPromise, publicationListResponse, sessionResponse, sharedCollectionListResponse, sharedCollectionResponse, siteResponse, tagResponse, type ApiKeyResponse, type BookmarkPageResponse, type Folder as FolderType, type JsonValue, type Publication, type SharedCollection, type Site, type Tag as TagType, type UserResponse } from "@loomark/shared";
import { useTheme, type ThemeMode } from "./theme-provider";

const initial: DashboardData = { bookmarks: [], folders: [], tags: [], sites: [], totalClicks: 0 };
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
  const [activeView, setActiveView] = useState<"all" | "recent" | "favorites" | "sites" | "discover">("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"recent" | "clicks" | "az">("recent");
  const [showAdd, setShowAdd] = useState(false);
  const [addSiteId, setAddSiteId] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<BookmarkType | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [folderEditor, setFolderEditor] = useState<FolderType | "new" | null>(null);
  const [tagEditor, setTagEditor] = useState<TagType | "new" | null>(null);
  const [siteEditor, setSiteEditor] = useState<Site | "new" | null>(null);
  const [publishingTag, setPublishingTag] = useState<TagType | null>(null);
  const [tagManageMode, setTagManageMode] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<"grid" | "list" | "table">("grid");
  const [pageInfo, setPageInfo] = useState<BookmarkPageResponse>({ items: [], page: 1, pageSize: 9, total: 0, totalPages: 0 });
  const [publications, setPublications] = useState<Publication[]>([]);
  const [sharedCollections, setSharedCollections] = useState<SharedCollection[]>([]);
  const [discoverMode, setDiscoverMode] = useState<"collections" | "links">("collections");
  const [savedPublicationIds, setSavedPublicationIds] = useState<Set<string>>(() => new Set());
  const [savedCollectionIds, setSavedCollectionIds] = useState<Set<string>>(() => new Set());

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
  async function loadPage(page: number): Promise<void> {
    setPageLoading(true);
    setPageError(null);
    const params = new URLSearchParams({ page: String(page), pageSize: "9", sort: activeView === "recent" ? "recent" : sort });
    if (activeView === "favorites") params.set("favorite", "true");
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
    setPageInfo(parsed.data);
    setPageLoading(false);
  }

  async function loadDiscover(): Promise<void> {
    setPageLoading(true);
    setPageError(null);
    const responseResult = await fromPromise(apiFetch("/api/v1/discover", { cache: "no-store" }), () => ({ code: "NETWORK_ERROR", message: "无法连接到服务器" }));
    if (!responseResult.ok) { setPageError(responseResult.error.message); setPageLoading(false); return; }
    const bodyResult = await fromPromise(responseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }));
    const parsed = bodyResult.ok ? publicationListResponse.safeParse(bodyResult.value) : null;
    if (!responseResult.value.ok || !parsed?.success) { setPageError("无法加载其他用户的分享"); setPageLoading(false); return; }
    setPublications(parsed.data);
    const collectionResponseResult = await fromPromise(apiFetch("/api/v1/discover/collections", { cache: "no-store" }), () => ({ code: "NETWORK_ERROR", message: "无法连接到服务器" }));
    if (!collectionResponseResult.ok) { setPageError(collectionResponseResult.error.message); setPageLoading(false); return; }
    const collectionBodyResult = await fromPromise(collectionResponseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }));
    const parsedCollections = collectionBodyResult.ok ? sharedCollectionListResponse.safeParse(collectionBodyResult.value) : null;
    if (!collectionResponseResult.value.ok || !parsedCollections?.success) { setPageError("无法加载共享合集"); setPageLoading(false); return; }
    setSharedCollections(parsedCollections.data);
    setPageLoading(false);
  }

  useEffect(() => {
    if (!user) return;
    if (activeView === "discover") void loadDiscover();
    else if (activeView !== "sites") void loadPage(1);
  }, [activeFolder, activeTag, activeView, query, sort, user]);

  const visible = pageInfo.items;
  const folderName = activeView === "recent" ? "最近添加" : activeView === "favorites" ? "我的收藏" : activeView === "sites" ? "网站" : activeView === "discover" ? "发现" : data.folders.find((folder) => folder.id === activeFolder)?.name || "全部书签";

  function openAddBookmark(siteId: string | null = null): void { setAddSiteId(siteId); setShowAdd(true); }
  function handleAdd(bookmark: BookmarkType) { void refreshDashboard(); setShowAdd(false); setAddSiteId(null); if (activeView !== "sites") { setActiveView("all"); setActiveFolder(bookmark.folderId || "all"); void loadPage(1); } }
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
  async function toggleFavorite(bookmark: BookmarkType): Promise<void> {
    const responseResult = await fromPromise(apiFetch(`/api/v1/bookmarks/${bookmark.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ isFavorite: !bookmark.isFavorite }) }), () => ({ code: "NETWORK_ERROR", message: "无法更新收藏" }));
    if (!responseResult.ok) return;
    const bodyResult = await fromPromise(responseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }));
    const parsed = bodyResult.ok ? bookmarkResponse.safeParse(bodyResult.value) : null;
    if (!responseResult.value.ok || !parsed?.success) return;
    setPageInfo((current) => ({ ...current, items: current.items.map((item) => item.id === bookmark.id ? parsed.data : item) }));
    void refreshDashboard();
  }

  async function toggleShare(bookmark: BookmarkType): Promise<void> {
    if (bookmark.publicationId && !window.confirm(`确定停止分享“${bookmark.title}”吗？`)) return;
    const responseResult = await fromPromise(apiFetch(`/api/v1/bookmarks/${bookmark.id}/share`, { method: bookmark.publicationId ? "DELETE" : "POST" }), () => ({ code: "NETWORK_ERROR", message: "无法更新分享状态" }));
    if (!responseResult.ok || !responseResult.value.ok) return;
    await refreshDashboard();
    await loadPage(pageInfo.page);
  }

  async function saveSharedBookmark(publication: Publication): Promise<void> {
    const responseResult = await fromPromise(apiFetch(`/api/v1/discover/${publication.id}/save`, { method: "POST" }), () => ({ code: "NETWORK_ERROR", message: "无法保存分享" }));
    if (!responseResult.ok || !responseResult.value.ok) return;
    setSavedPublicationIds((current) => new Set(current).add(publication.id));
    void refreshDashboard();
  }

  async function saveCollection(collection: SharedCollection): Promise<void> {
    const responseResult = await fromPromise(apiFetch(`/api/v1/shared-collections/${collection.id}/save`, { method: "POST" }), () => ({ code: "NETWORK_ERROR", message: "无法保存合集" }));
    if (!responseResult.ok || !responseResult.value.ok) return;
    setSavedCollectionIds((current) => new Set(current).add(collection.id));
    void refreshDashboard();
  }

  async function logout(): Promise<void> {
    const result = await fromPromise(apiFetch("/api/auth/logout", { method: "POST" }), () => ({ code: "NETWORK_ERROR", message: "无法退出登录" }));
    if (result.ok) { setUser(null); setShowMenu(false); setData(initial); setPageInfo({ items: [], page: 1, pageSize: 9, total: 0, totalPages: 0 }); }
  }

  if (authLoading) return <div className="auth-shell"><div className="auth-status">正在检查登录状态...</div></div>;
  if (!user) return <LoginScreen onLoggedIn={setUser} />;

  return <div className="shell">
    <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
      <div className="brand"><span className="brand-mark"><Bookmark size={17} strokeWidth={2.6} /></span><span>bookmark-nav</span><button className="icon-button sidebar-close" onClick={() => setMobileNav(false)}><X size={18} /></button></div>
      <nav className="nav">
        <p className="nav-label">个人空间</p>
        <button className={`nav-item ${activeView === "all" && activeFolder === "all" && !activeTag ? "selected" : ""}`} onClick={() => { setActiveView("all"); setActiveFolder("all"); setActiveTag(null); setMobileNav(false); }}><LayoutGrid size={17} />我的书签<span className="nav-count">{data.bookmarks.length}</span></button>
        <button className={`nav-item ${activeView === "recent" ? "selected" : ""}`} onClick={() => { setActiveView("recent"); setActiveFolder("all"); setActiveTag(null); setSort("recent"); setMobileNav(false); }}><Clock3 size={17} />最近添加</button>
        <button className={`nav-item ${activeView === "favorites" ? "selected" : ""}`} onClick={() => { setActiveView("favorites"); setActiveFolder("all"); setActiveTag(null); setMobileNav(false); }}><Star size={17} />我的收藏<span className="nav-count">{data.bookmarks.filter((bookmark) => bookmark.isFavorite).length}</span></button>
        <button className={`nav-item ${activeView === "sites" ? "selected" : ""}`} onClick={() => { setActiveView("sites"); setActiveFolder("all"); setActiveTag(null); setMobileNav(false); }}><Globe2 size={17} />网站<span className="nav-count">{data.sites.length}</span></button>
        <p className="nav-label folder-label">共享空间</p>
        <button className={`nav-item ${activeView === "discover" ? "selected" : ""}`} onClick={() => { setActiveView("discover"); setActiveFolder("all"); setActiveTag(null); setMobileNav(false); }}><Compass size={17} />发现</button>
        <p className="nav-label folder-label">目录 <button className="tiny-add" onClick={() => setFolderEditor("new")} title="创建目录" aria-label="创建目录"><Plus size={14} /></button></p>
        {data.folders.filter((folder) => folder.id !== "all").map((folder) => <div className="nav-manage-row" key={folder.id}><button className={`nav-item ${activeView === "all" && activeFolder === folder.id ? "selected" : ""}`} onClick={() => { setActiveView("all"); setActiveFolder(folder.id); setActiveTag(null); setMobileNav(false); }}><span className="folder-icon">{folder.icon}</span>{folder.name}<span className="nav-count">{folder.count}</span></button><button className="nav-edit" onClick={() => setFolderEditor(folder)} title={`编辑${folder.name}`} aria-label={`编辑${folder.name}`}><Pencil size={13} /></button></div>)}
      </nav>
      <TagManagementPanel tags={data.tags} activeTag={activeTag} editMode={tagManageMode} onToggleEdit={() => setTagManageMode((current) => !current)} onCreate={() => setTagEditor("new")} onEdit={setTagEditor} onPublish={setPublishingTag} onDelete={(tag) => void deleteTag(tag)} onSelect={(tag) => { setActiveView("all"); setActiveTag(activeTag === tag.id ? null : tag.id); setActiveFolder("all"); setMobileNav(false); }} />
      <div className="sidebar-bottom"><ThemeSwitcher mode={mode} setMode={setMode} /></div>
    </aside>
    {mobileNav && <button className="backdrop" onClick={() => setMobileNav(false)} aria-label="关闭导航" />}
    <main className="main">
      <header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMobileNav(true)}><Menu size={20} /></button><div className="breadcrumbs"><span>工作台</span><span>/</span><strong>{folderName}</strong>{activeTag && <><span>/</span><strong className="crumb-tag">#{data.tags.find((tag) => tag.id === activeTag)?.name}</strong></>}</div><div className="top-actions"><div className="top-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索书签..." /><kbd>⌘ K</kbd></div><button className="icon-button"><BarChart3 size={18} /></button><div className="menu-wrap"><button className="avatar mini" onClick={() => setShowMenu(!showMenu)}>{user.name.slice(0, 1).toUpperCase()}</button>{showMenu && <div className="user-menu"><strong>{user.name}</strong><span>{user.email}</span><hr /><button onClick={() => { setShowAccount(true); setShowMenu(false); }}><Settings2 size={15} />账号设置</button><button onClick={() => void logout()}><LogOut size={15} />退出登录</button></div>}</div></div></header>
      <section className="content">
        <div className="welcome">
          <div><p className="eyebrow">{activeView === "discover" ? "共享空间" : "个人空间"}</p><h1>{activeView === "discover" ? "发现他人的分享。" : activeView === "sites" ? "按网站浏览。" : "你的数字空间。"}</h1><p className="subline">{activeView === "discover" ? "保存感兴趣的内容后，它会成为你自己的私人书签。" : activeView === "sites" ? "同一网站的多个页面会自动归在一起。" : "把值得收藏的一切，整理在触手可及的地方。"}</p></div>
          {activeView !== "discover" && <div className="welcome-actions">{activeView !== "sites" && <button className="secondary-button" disabled={!visible.length} onClick={() => setShowEdit((current) => !current)} title={showEdit ? "完成当前页面编辑" : "编辑当前页面书签"}>{showEdit ? <><Check size={16} />完成编辑</> : <><Pencil size={16} />编辑书签</>}</button>}<button className="primary-button" onClick={() => openAddBookmark()}><Plus size={17} />添加书签</button></div>}
        </div>
        {activeView === "discover" ? <>
          <div className="section-heading"><div><h2>{discoverMode === "collections" ? "共享合集" : "单条分享"}</h2><span>{discoverMode === "collections" ? sharedCollections.length : publications.length} 个公开内容</span></div><div className="discovery-tabs" role="tablist" aria-label="发现内容类型"><button role="tab" aria-selected={discoverMode === "collections"} className={discoverMode === "collections" ? "active" : ""} onClick={() => setDiscoverMode("collections")}>共享合集</button><button role="tab" aria-selected={discoverMode === "links"} className={discoverMode === "links" ? "active" : ""} onClick={() => setDiscoverMode("links")}>单条分享</button></div></div>
          {pageLoading ? <LoadingState /> : pageError ? <div className="empty"><Archive size={30} /><strong>分享加载失败</strong><span>{pageError}</span><button className="secondary-button" onClick={() => void loadDiscover()}>重新加载</button></div> : discoverMode === "collections" ? sharedCollections.length ? <SharedCollectionGrid collections={sharedCollections} savedIds={savedCollectionIds} onSave={(collection) => void saveCollection(collection)} /> : <div className="empty"><Compass size={30} /><strong>暂时没有共享合集</strong><span>用户将个人标签发布为合集后会展示在这里。</span></div> : publications.length ? <DiscoveryGrid publications={publications} savedIds={savedPublicationIds} onSave={(publication) => void saveSharedBookmark(publication)} /> : <div className="empty"><Compass size={30} /><strong>暂时没有单条分享</strong><span>个人书签不会出现在这里，只有主动分享的内容才会展示。</span></div>}
        </> : activeView === "sites" ? <>
          <div className="section-heading"><div><h2>网站</h2><span>{data.sites.length} 个网站</span></div><button className="secondary-button" onClick={() => setSiteEditor("new")}><Plus size={15} />新建网站</button></div>
          <SiteGroups sites={data.sites} bookmarks={data.bookmarks} tags={data.tags} onAddLink={(siteId) => openAddBookmark(siteId)} onEdit={setSiteEditor} />
        </> : <>
          <div className="section-heading"><div><h2>{activeTag ? `#${data.tags.find((tag) => tag.id === activeTag)?.name}` : folderName}</h2><span>{pageInfo.total} 个书签</span></div><div className="view-actions"><div className="sort-wrap"><SlidersHorizontal size={15} /><select value={activeView === "recent" ? "recent" : sort} disabled={activeView === "recent"} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="recent">最近添加</option><option value="clicks">访问最多</option><option value="az">名称排序</option></select></div><div className="display-toggle" aria-label="展示方式"><button className={displayMode === "grid" ? "active" : ""} onClick={() => setDisplayMode("grid")} title="大图展示" aria-label="大图展示"><LayoutGrid size={16} /></button><button className={displayMode === "list" ? "active" : ""} onClick={() => setDisplayMode("list")} title="列表展示" aria-label="列表展示"><List size={16} /></button><button className={displayMode === "table" ? "active" : ""} onClick={() => setDisplayMode("table")} title="表格展示" aria-label="表格展示"><Table2 size={16} /></button></div><button className="icon-button" onClick={() => openAddBookmark()} title="添加书签" aria-label="添加书签"><Plus size={18} /></button></div></div>
          {showEdit ? <BookmarkEditMode bookmarks={visible} onEdit={setEditingBookmark} onDelete={(bookmark) => void deleteBookmark(bookmark)} /> : loading || pageLoading ? <LoadingState /> : pageError ? <div className="empty"><Archive size={30} /><strong>书签加载失败</strong><span>{pageError}</span><button className="secondary-button" onClick={() => void loadPage(pageInfo.page)}>重新加载</button></div> : visible.length ? <>
            {displayMode === "grid" && <div className="bookmark-grid" role="list" aria-label="大图书签">{visible.map((bookmark) => <BookmarkCard key={bookmark.id} bookmark={bookmark} tags={data.tags} onFavorite={() => void toggleFavorite(bookmark)} onShare={() => void toggleShare(bookmark)} onClick={() => clickBookmark(bookmark)} />)}</div>}
            {displayMode === "list" && <div className="bookmark-list" role="list" aria-label="列表书签">{visible.map((bookmark) => <BookmarkListRow key={bookmark.id} bookmark={bookmark} tags={data.tags} onFavorite={() => void toggleFavorite(bookmark)} onShare={() => void toggleShare(bookmark)} onClick={() => clickBookmark(bookmark)} />)}</div>}
            {displayMode === "table" && <BookmarkTable bookmarks={visible} folders={data.folders} tags={data.tags} onFavorite={toggleFavorite} onShare={toggleShare} onClick={clickBookmark} />}
            {pageInfo.totalPages > 0 && <div className="pagination"><span>第 {pageInfo.page} / {pageInfo.totalPages} 页，共 {pageInfo.total} 个</span><div><button className="icon-button" disabled={pageLoading || pageInfo.page <= 1} onClick={() => void loadPage(pageInfo.page - 1)} title="上一页" aria-label="上一页"><ChevronLeft size={17} /></button><button className="icon-button" disabled={pageLoading || pageInfo.page >= pageInfo.totalPages} onClick={() => void loadPage(pageInfo.page + 1)} title="下一页" aria-label="下一页"><ChevronRight size={17} /></button></div></div>}
          </> : <div className="empty"><Archive size={30} /><strong>{activeView === "favorites" ? "还没有收藏的书签" : "还没有匹配的书签"}</strong><span>{activeView === "favorites" ? "点击书签卡片右上角的星标即可收藏" : "试试其他关键词或添加一个新书签"}</span><button className="primary-button" onClick={() => openAddBookmark()}><Plus size={16} />添加书签</button></div>}
        </>}
        <footer><span>已同步 · 刚刚</span><span><Link2 size={13} /> API 已就绪</span></footer>
      </section>
    </main>
    {showAdd && <AddBookmarkModal folders={data.folders.filter((folder) => folder.id !== "all")} tags={data.tags} sites={data.sites} initialSiteId={addSiteId} onClose={() => { setShowAdd(false); setAddSiteId(null); }} onAdded={handleAdd} />}
    {editingBookmark && <EditBookmarkModal bookmarks={[editingBookmark]} folders={data.folders.filter((folder) => folder.id !== "all")} tags={data.tags} sites={data.sites} onClose={() => setEditingBookmark(null)} onSaved={(updated) => { setEditingBookmark(null); setPageInfo((current) => ({ ...current, items: current.items.map((item) => item.id === updated.id ? updated : item) })); setData((current) => ({ ...current, bookmarks: current.bookmarks.map((item) => item.id === updated.id ? updated : item) })); void refreshDashboard(); }} />}
    {showAccount && <AccountModal user={user} onClose={() => setShowAccount(false)} onSaved={(updated) => { setUser(updated); setShowAccount(false); }} />}
    {folderEditor && <FolderModal folder={folderEditor === "new" ? null : folderEditor} onClose={() => setFolderEditor(null)} onSaved={() => { setFolderEditor(null); void refreshDashboard(); }} />}
    {tagEditor && <TagModal tag={tagEditor === "new" ? null : tagEditor} tags={data.tags} onClose={() => setTagEditor(null)} onSaved={() => { setTagEditor(null); void refreshDashboard(); }} />}
    {siteEditor && <SiteModal site={siteEditor === "new" ? null : siteEditor} folders={data.folders.filter((folder) => folder.id !== "all")} tags={data.tags} onClose={() => setSiteEditor(null)} onSaved={() => { setSiteEditor(null); void refreshDashboard(); }} />}
    {publishingTag && <PublishCollectionModal tag={publishingTag} bookmarks={data.bookmarks} sites={data.sites} onClose={() => setPublishingTag(null)} onSaved={() => { setPublishingTag(null); void refreshDashboard(); }} />}
  </div>;
}

function LoadingState() {
  return <div className="loading-state" aria-label="正在加载书签" aria-busy="true"><div className="loading-toolbar"><span className="skeleton-line medium" /><span className="skeleton-line short" /></div><div className="loading-grid">{["one", "two", "three", "four", "five", "six"].map((key) => <div className="bookmark-card skeleton-bookmark" key={key}><span className="skeleton-block skeleton-favicon" /><span className="skeleton-line medium" /><span className="skeleton-line long" /><span className="skeleton-line paragraph" /><div className="skeleton-footer"><span className="skeleton-line tag" /><span className="skeleton-line tiny" /></div></div>)}</div></div>;
}

function DiscoveryGrid({ publications, savedIds, onSave }: { publications: Publication[]; savedIds: Set<string>; onSave: (publication: Publication) => void }) {
  return <div className="bookmark-grid discovery-grid">{publications.map((publication) => <article className="bookmark-card discovery-card" key={publication.id}><div className="card-top"><div className="favicon"><img src={publication.favicon} alt="" /></div><span className="shared-author">{publication.author.name}</span></div><a href={publication.url} target="_blank" rel="noreferrer"><h3>{publication.title}</h3><span className="domain">{publication.domain}<ArrowUpRight size={12} /></span></a><p>{publication.description || "分享者没有添加描述"}</p><div className="card-bottom"><span className="published-at">{new Date(publication.publishedAt).toLocaleDateString("zh-CN")}</span><button className="secondary-button save-shared" disabled={savedIds.has(publication.id)} onClick={() => onSave(publication)}><Plus size={14} />{savedIds.has(publication.id) ? "已保存" : "保存到我的书签"}</button></div></article>)}</div>;
}

function SharedCollectionGrid({ collections, savedIds, onSave }: { collections: SharedCollection[]; savedIds: Set<string>; onSave: (collection: SharedCollection) => void }) {
  return <div className="collection-grid">{collections.map((collection) => <article className="shared-collection-card" key={collection.id}><header><div><span className="shared-author">{collection.author.name}</span><h3>{collection.name}</h3></div><span className="collection-count">{collection.items.length} 条</span></header><p>{collection.description || "作者没有添加合集描述"}</p><div className="collection-preview">{collection.items.slice(0, 4).map((item) => <a href={item.url} target="_blank" rel="noreferrer" key={item.id}><img src={item.favicon} alt="" /><span>{item.title}</span><ArrowUpRight size={12} /></a>)}</div><footer><span>{new Date(collection.updatedAt).toLocaleDateString("zh-CN")} 更新</span><button className="primary-button" disabled={savedIds.has(collection.id)} onClick={() => onSave(collection)}><Plus size={14} />{savedIds.has(collection.id) ? "已保存" : "保存整个合集"}</button></footer></article>)}</div>;
}

function SiteGroups({ sites, bookmarks, tags, onAddLink, onEdit }: { sites: Site[]; bookmarks: BookmarkType[]; tags: TagType[]; onAddLink: (siteId: string) => void; onEdit: (site: Site) => void }) {
  if (!sites.length) return <div className="empty"><Globe2 size={30} /><strong>还没有网站</strong><span>新建网站，或添加书签时让系统自动归站。</span></div>;
  return <div className="site-groups">{sites.map((site) => { const items = bookmarks.filter((bookmark) => bookmark.siteId === site.id); return <section className="site-group" key={site.id}><header><div className="favicon"><img src={site.favicon} alt="" /></div><div><strong>{site.name}</strong><span>{site.domain} · {items.length} 个子链接</span></div><div className="site-actions"><button className="icon-button" onClick={() => onEdit(site)} title={`编辑${site.name}`} aria-label={`编辑${site.name}`}><Pencil size={14} /></button><button className="icon-button" onClick={() => onAddLink(site.id)} title={`为${site.name}添加子链接`} aria-label={`为${site.name}添加子链接`}><Plus size={15} /></button></div></header>{site.tags.length > 0 && <div className="site-tags">{site.tags.map((id) => { const tag = tags.find((item) => item.id === id); return tag ? <span key={id} style={{ "--tag-color": tag.color } as React.CSSProperties}>#{tag.name}</span> : null; })}</div>}<div className="site-links">{items.map((bookmark) => <a href={bookmark.url} target="_blank" rel="noreferrer" key={bookmark.id}><span>{bookmark.title}</span><ArrowUpRight size={13} /></a>)}</div></section>; })}</div>;
}

function TagManagementPanel({ tags, activeTag, editMode, onToggleEdit, onCreate, onEdit, onPublish, onDelete, onSelect }: { tags: TagType[]; activeTag: string | null; editMode: boolean; onToggleEdit: () => void; onCreate: () => void; onEdit: (tag: TagType) => void; onPublish: (tag: TagType) => void; onDelete: (tag: TagType) => void; onSelect: (tag: TagType) => void }) {
  const roots = tags.filter((tag) => !tag.parentId);
  const ordered = roots.flatMap((root) => [root, ...tags.filter((tag) => tag.parentId === root.id)]);
  return <section className="tag-management-panel" aria-label="标签管理"><div className="tag-management-header"><span className="nav-label">标签</span><span className="tag-label-actions"><button className="tiny-add" onClick={onCreate} title="创建标签" aria-label="创建标签"><Plus size={14} /></button><button className={`tag-manage-toggle ${editMode ? "active" : ""}`} onClick={onToggleEdit} title={editMode ? "完成标签编辑" : "编辑标签"} aria-label={editMode ? "完成标签编辑" : "编辑标签"}>{editMode ? <Check size={14} /> : <Pencil size={13} />}</button></span></div><div className="tag-cloud">{ordered.map((tag) => <div className={`tag-management-row ${tag.parentId ? "child" : ""}`} key={tag.id}><button disabled={editMode} className={`tag-filter ${activeTag === tag.id ? "active" : ""}`} onClick={() => onSelect(tag)}><span className="tag-dot" style={{ background: tag.color }} />{tag.name}<span>{tag.count}</span></button>{editMode && <span className="tag-action-badges"><button className={tag.collectionId ? "shared-active" : "tag-action-edit"} onClick={() => onPublish(tag)} title={tag.collectionId ? `同步合集${tag.name}` : `发布标签${tag.name}`} aria-label={tag.collectionId ? `同步合集${tag.name}` : `发布标签${tag.name}`}><Share2 size={13} /></button><button className="tag-action-edit" onClick={() => onEdit(tag)} title={`编辑${tag.name}`} aria-label={`编辑${tag.name}`}><Pencil size={13} /></button><button className="tag-action-delete" onClick={() => onDelete(tag)} title={`删除${tag.name}`} aria-label={`删除${tag.name}`}><X size={13} /></button></span>}</div>)}</div></section>;
}

type BookmarkDraft = { id: string; title: string; description: string; folderId: string; tags: string[] };

function BookmarkInlineEditMode({ bookmarks, folders, tags, onSaved }: { bookmarks: BookmarkType[]; folders: DashboardData["folders"]; tags: DashboardData["tags"]; onSaved: (bookmark: BookmarkType) => void }) {
  const [drafts, setDrafts] = useState<BookmarkDraft[]>(() => bookmarks.map((bookmark) => ({ id: bookmark.id, title: bookmark.title, description: bookmark.description, folderId: bookmark.folderId || "", tags: bookmark.tags })));
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDrafts(bookmarks.map((bookmark) => ({ id: bookmark.id, title: bookmark.title, description: bookmark.description, folderId: bookmark.folderId || "", tags: bookmark.tags })));
  }, [bookmarks]);

  function updateDraft(id: string, update: (draft: BookmarkDraft) => BookmarkDraft): void {
    setDrafts((current) => current.map((draft) => draft.id === id ? update(draft) : draft));
  }

  async function saveDraft(draft: BookmarkDraft): Promise<void> {
    setSavingId(draft.id); setError(null);
    const responseResult = await fromPromise(apiFetch(`/api/v1/bookmarks/${draft.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: draft.title, description: draft.description, folderId: draft.folderId || null, tags: draft.tags }) }), () => ({ code: "NETWORK_ERROR", message: "无法保存书签" }));
    if (!responseResult.ok) { setError(responseResult.error.message); setSavingId(null); return; }
    const bodyResult = await fromPromise(responseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }));
    const parsed = bodyResult.ok ? bookmarkResponse.safeParse(bodyResult.value) : null;
    if (!responseResult.value.ok || !parsed?.success) { setError("书签保存失败"); setSavingId(null); return; }
    onSaved(parsed.data); setSavingId(null);
  }

  return <div className="bookmark-edit-mode" role="group" aria-label="当前页面书签编辑模式"><div className="edit-mode-hint"><Pencil size={15} /><span>当前页面的 {drafts.length} 个书签均可编辑</span></div>{drafts.map((draft) => { const bookmark = bookmarks.find((item) => item.id === draft.id); if (!bookmark) return null; return <article className="bookmark-inline-editor" key={draft.id}><div className="inline-editor-heading"><div className="favicon"><img src={bookmark.favicon} alt="" /></div><div><strong>{bookmark.title}</strong><span>{bookmark.domain}</span></div></div><div className="inline-editor-fields"><label>标题<input value={draft.title} onChange={(event) => updateDraft(draft.id, (current) => ({ ...current, title: event.target.value }))} maxLength={120} required /></label><label>描述<textarea value={draft.description} onChange={(event) => updateDraft(draft.id, (current) => ({ ...current, description: event.target.value }))} rows={2} maxLength={500} /></label><label>目录<select value={draft.folderId} onChange={(event) => updateDraft(draft.id, (current) => ({ ...current, folderId: event.target.value }))}><option value="">未分类</option>{folders.map((folder) => <option value={folder.id} key={folder.id}>{folder.name}</option>)}</select></label></div><div className="inline-editor-tags"><span>标签</span><div>{tags.map((tag) => <button type="button" key={tag.id} className={draft.tags.includes(tag.id) ? "picked" : ""} aria-pressed={draft.tags.includes(tag.id)} onClick={() => updateDraft(draft.id, (current) => ({ ...current, tags: current.tags.includes(tag.id) ? current.tags.filter((id) => id !== tag.id) : [...current.tags, tag.id] }))}><span className="tag-dot" style={{ background: tag.color }} />{tag.name}</button>)}</div></div><div className="inline-editor-actions"><span className="inline-editor-url">{bookmark.url}</span><button className="primary-button" disabled={savingId === draft.id} onClick={() => void saveDraft(draft)}>{savingId === draft.id ? "保存中..." : "保存此书签"}</button></div></article>; })}{error && <p className="form-error" role="alert">{error}</p>}</div>;
}

function BookmarkEditMode({ bookmarks, onEdit, onDelete }: { bookmarks: BookmarkType[]; onEdit: (bookmark: BookmarkType) => void; onDelete: (bookmark: BookmarkType) => void }) {
  return <div className="bookmark-edit-mode" role="group" aria-label="当前页面书签编辑模式"><div className="edit-mode-hint"><Pencil size={15} /><span>编辑模式：每条书签都可以单独编辑或删除</span></div><div className="bookmark-edit-grid">{bookmarks.map((bookmark) => <article className="bookmark-edit-item" key={bookmark.id}><div className="inline-editor-heading"><div className="favicon"><img src={bookmark.favicon} alt="" /></div><div><strong>{bookmark.title}</strong><span>{bookmark.domain}</span></div></div><div className="bookmark-edit-badges"><button className="tag-action-edit" onClick={() => onEdit(bookmark)} title={`编辑${bookmark.title}`} aria-label={`编辑${bookmark.title}`}><Pencil size={14} /></button><button className="tag-action-delete" onClick={() => onDelete(bookmark)} title={`删除${bookmark.title}`} aria-label={`删除${bookmark.title}`}><X size={14} /></button></div></article>)}</div></div>;
}

function ThemeSwitcher({ mode, setMode }: { mode: ThemeMode; setMode: (mode: ThemeMode) => void }) {
  const options: readonly { value: ThemeMode; label: string; icon: typeof Sun }[] = [{ value: "system", label: "跟随系统", icon: Monitor }, { value: "light", label: "浅色主题", icon: Sun }, { value: "dark", label: "深色主题", icon: Moon }];
  return <div className="theme-switcher" aria-label="主题设置">{options.map(({ value, label, icon: Icon }) => <button key={value} className={mode === value ? "active" : ""} onClick={() => setMode(value)} title={label} aria-label={label}><Icon size={14} /></button>)}</div>;
}

function GoogleLogo() {
  return <svg className="google-logo" viewBox="0 0 18 18" aria-hidden="true" focusable="false"><path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.797 2.716v2.259h2.909c1.702-1.567 2.684-3.874 2.684-6.615Z" /><path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.956-2.18l-2.909-2.259c-.806.54-1.835.859-3.047.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.332A9 9 0 0 0 9 18Z" /><path fill="#FBBC05" d="M3.963 10.706A5.41 5.41 0 0 1 3.681 9c0-.592.102-1.168.282-1.706V4.962H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.038l3.007-2.332Z" /><path fill="#EA4335" d="M9 3.58c1.321 0 2.507.454 3.44 1.345l2.581-2.581C13.464.892 11.426 0 9 0A9 9 0 0 0 .956 4.962l3.007 2.332C4.672 5.165 6.656 3.58 9 3.58Z" /></svg>;
}

function LoginScreen({ onLoggedIn }: { onLoggedIn: (user: UserResponse) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loginMethod, setLoginMethod] = useState<"google" | "password">("google");
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("google_error");
    if (code === "ACCOUNT_NOT_FOUND") setError("该 Google 邮箱尚未开通 bookmark-nav 账号");
    else if (code === "cancelled") setError("已取消 Google 登录");
    else if (code) setError("Google 登录失败，请稍后重试");
  }, []);
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
  function fillDemoCredentials(): void {
    setEmail("test@bookmark-nav.local");
    setPassword("Test123456!");
    setError("");
  }
  return <main className="auth-shell"><div className="auth-panel"><div className="auth-brand"><span className="brand-mark"><Bookmark size={18} strokeWidth={2.6} /></span><strong>bookmark-nav</strong></div><div><p className="eyebrow">个人工作区</p><h1>登录</h1><p>选择适合你的方式进入书签工作台。</p></div><div className="auth-tabs" role="tablist" aria-label="登录方式"><button type="button" id="google-login-tab" role="tab" aria-selected={loginMethod === "google"} aria-controls="google-login-panel" className={loginMethod === "google" ? "active" : ""} onClick={() => setLoginMethod("google")}>Google 登录</button><button type="button" id="password-login-tab" role="tab" aria-selected={loginMethod === "password"} aria-controls="password-login-panel" className={loginMethod === "password" ? "active" : ""} onClick={() => setLoginMethod("password")}>账号密码登录</button></div><div className="auth-tab-content">{loginMethod === "google" ? <section className="auth-method google-auth" id="google-login-panel" role="tabpanel" aria-labelledby="google-login-tab"><a className="secondary-button auth-submit" href="/auth/google"><GoogleLogo />使用 Google 登录</a><small>首次使用会自动创建账号。</small>{error && <p className="form-error" role="alert">{error}</p>}</section> : <section id="password-login-panel" role="tabpanel" aria-labelledby="password-login-tab"><form className="password-login-form" onSubmit={(event) => void submit(event)}><label>邮箱<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label><label>密码<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" minLength={8} required /></label><button type="button" className="demo-link" onClick={fillDemoCredentials}>Demo 尝试</button>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button auth-submit" disabled={submitting}>{submitting ? "登录中..." : "登录"}</button></form></section>}</div></div></main>;
}

function AccountModal({ user, onClose, onSaved }: { user: UserResponse; onClose: () => void; onSaved: (user: UserResponse) => void }) {
  const [tab, setTab] = useState<"account" | "extension">("account");
  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [keys, setKeys] = useState<ApiKeyResponse[]>([]);
  const [keyName, setKeyName] = useState("Chrome 扩展");
  const [createdKey, setCreatedKey] = useState("");
  const [keyLoading, setKeyLoading] = useState(true);
  const [keyError, setKeyError] = useState("");
  const [copied, setCopied] = useState(false);

  async function loadKeys(): Promise<void> {
    setKeyLoading(true);
    const responseResult = await fromPromise(apiFetch("/api/v1/api-keys", { cache: "no-store" }), () => ({ code: "NETWORK_ERROR", message: "无法加载 API Key" }));
    if (!responseResult.ok) { setKeyError(responseResult.error.message); setKeyLoading(false); return; }
    const bodyResult = await fromPromise(responseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }));
    const parsed = bodyResult.ok ? apiKeyListResponse.safeParse(bodyResult.value) : null;
    if (!responseResult.value.ok || !parsed?.success) setKeyError("无法加载 API Key");
    else { setKeys(parsed.data); setKeyError(""); }
    setKeyLoading(false);
  }

  useEffect(() => { void loadKeys(); }, []);

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault(); setSaving(true); setError("");
    const responseResult = await fromPromise(apiFetch("/api/v1/account", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, currentPassword: currentPassword || undefined, newPassword: newPassword || undefined }) }), () => ({ code: "NETWORK_ERROR", message: "无法连接到服务器" }));
    if (!responseResult.ok) { setError(responseResult.error.message); setSaving(false); return; }
    const bodyResult = await fromPromise(responseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }));
    const parsed = bodyResult.ok ? sessionResponse.safeParse(bodyResult.value) : null;
    if (!responseResult.value.ok || !parsed?.success) { setError(bodyResult.ok && typeof bodyResult.value === "object" && bodyResult.value !== null && "error" in bodyResult.value && typeof bodyResult.value.error === "string" ? bodyResult.value.error : "账号设置保存失败"); setSaving(false); return; }
    onSaved(parsed.data.user); setSaving(false);
  }

  async function generateKey(): Promise<void> {
    setKeyLoading(true); setKeyError(""); setCreatedKey(""); setCopied(false);
    const responseResult = await fromPromise(apiFetch("/api/v1/api-keys", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: keyName }) }), () => ({ code: "NETWORK_ERROR", message: "无法创建 API Key" }));
    if (!responseResult.ok) { setKeyError(responseResult.error.message); setKeyLoading(false); return; }
    const bodyResult = await fromPromise(responseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }));
    const parsed = bodyResult.ok ? apiKeyCreatedResponse.safeParse(bodyResult.value) : null;
    if (!responseResult.value.ok || !parsed?.success) setKeyError("API Key 创建失败");
    else { setCreatedKey(parsed.data.key); setKeys((current) => [{ ...parsed.data, key: undefined } as ApiKeyResponse, ...current]); }
    setKeyLoading(false);
  }

  async function revokeKey(key: ApiKeyResponse): Promise<void> {
    if (!window.confirm(`确定撤销“${key.name}”吗？扩展将立即无法继续使用。`)) return;
    const result = await fromPromise(apiFetch(`/api/v1/api-keys/${key.id}`, { method: "DELETE" }), () => ({ code: "NETWORK_ERROR", message: "无法撤销 API Key" }));
    if (!result.ok || !result.value.ok) { setKeyError(result.ok ? "撤销失败" : result.error.message); return; }
    setKeys((current) => current.filter((item) => item.id !== key.id));
  }

  async function copyCreatedKey(): Promise<void> {
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
  }

  return <div className="modal-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal account-modal"><div className="modal-header"><div><p className="eyebrow">当前账号</p><h2>账号设置</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="关闭"><X size={18} /></button></div><div className="account-tabs" role="tablist" aria-label="账号设置栏目"><button type="button" role="tab" aria-selected={tab === "account"} className={tab === "account" ? "active" : ""} onClick={() => setTab("account")}><Settings2 size={15} />账号</button><button type="button" role="tab" aria-selected={tab === "extension"} className={tab === "extension" ? "active" : ""} onClick={() => setTab("extension")}><KeyRound size={15} />浏览器扩展</button></div>{tab === "account" ? <form onSubmit={(event) => void submit(event)}><label>邮箱<input value={user.email} disabled /></label><label>显示名称<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={60} /></label><div className="form-divider">修改密码（可选）</div><label>当前密码<input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" /></label><label>新密码<input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={8} /></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" disabled={saving}>{saving ? "保存中..." : "保存设置"}</button></div></form> : <section className="extension-settings" role="tabpanel"><div className="extension-download"><div><span className="extension-icon"><Bookmark size={20} /></span><div><strong>bookmark-nav for Chrome</strong><p>下载后在 Chrome 扩展管理页加载。</p></div></div><a className="primary-button" href="/downloads/bookmark-nav-extension.zip" download><Download size={15} />下载扩展</a></div><div className="key-create"><div><strong>扩展 API Key</strong><p>密钥仅在创建时显示，请直接导入扩展。</p></div><div className="key-create-row"><input aria-label="API Key 名称" value={keyName} onChange={(event) => setKeyName(event.target.value)} maxLength={60} /><button type="button" className="secondary-button" disabled={keyLoading || !keyName.trim()} onClick={() => void generateKey()}><Plus size={15} />创建</button></div></div>{createdKey && <div className="created-key"><div><KeyRound size={16} /><span><strong>新密钥已创建</strong><small>关闭后将无法再次查看</small></span></div><div className="key-value"><code>{createdKey}</code><button type="button" className="icon-button" onClick={() => void copyCreatedKey()} title="复制 API Key" aria-label="复制 API Key">{copied ? <Check size={16} /> : <Copy size={16} />}</button></div></div>}<div className="key-list-heading"><strong>已创建的密钥</strong><span>{keys.length} 个</span></div><div className="key-list">{keyLoading && !keys.length ? <p>正在加载...</p> : keys.length ? keys.map((key) => <div className="key-row" key={key.id}><span><strong>{key.name}</strong><code>{key.prefix}</code></span><span className="key-meta">{key.lastUsedAt ? `${new Date(key.lastUsedAt).toLocaleDateString("zh-CN")} 使用` : "尚未使用"}</span><button type="button" className="icon-button key-revoke" onClick={() => void revokeKey(key)} title={`撤销${key.name}`} aria-label={`撤销${key.name}`}><Trash2 size={15} /></button></div>) : <div className="key-empty">还没有扩展密钥</div>}</div>{keyError && <p className="form-error" role="alert">{keyError}</p>}</section>}</div></div>;
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

function SiteModal({ site, folders, tags, onClose, onSaved }: { site: Site | null; folders: DashboardData["folders"]; tags: TagType[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(site?.name || "");
  const [homepageUrl, setHomepageUrl] = useState(site?.homepageUrl || "");
  const [folderId, setFolderId] = useState(site?.folderId || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(site?.tags || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault(); setSaving(true); setError("");
    const responseResult = await fromPromise(apiFetch(site ? `/api/v1/sites/${site.id}` : "/api/v1/sites", { method: site ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, homepageUrl, folderId: folderId || null, tags: selectedTags }) }), () => ({ code: "NETWORK_ERROR", message: "无法连接到服务器" }));
    if (!responseResult.ok) { setError(responseResult.error.message); setSaving(false); return; }
    const bodyResult = await fromPromise(responseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }));
    const parsed = bodyResult.ok ? siteResponse.safeParse(bodyResult.value) : null;
    if (!responseResult.value.ok || !parsed?.success) { setError(bodyResult.ok && typeof bodyResult.value === "object" && bodyResult.value !== null && "error" in bodyResult.value && typeof bodyResult.value.error === "string" ? bodyResult.value.error : "网站保存失败"); setSaving(false); return; }
    onSaved(); setSaving(false);
  }
  async function remove(): Promise<void> {
    if (!site || !window.confirm(`确定删除网站“${site.name}”吗？`)) return;
    const result = await fromPromise(apiFetch(`/api/v1/sites/${site.id}`, { method: "DELETE" }), () => ({ code: "NETWORK_ERROR", message: "无法删除网站" }));
    if (!result.ok || !result.value.ok) { setError("请先删除网站下的子链接"); return; }
    onSaved();
  }
  return <div className="modal-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="modal compact-modal" onSubmit={(event) => void submit(event)}><div className="modal-header"><div><p className="eyebrow">网站管理</p><h2>{site ? "编辑网站" : "新建网站"}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="关闭"><X size={18} /></button></div><label>网站名称<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required autoFocus /></label><label>网站主页<input type="url" value={homepageUrl} onChange={(event) => setHomepageUrl(event.target.value)} placeholder="https://example.com" required /></label><label>继承目录<select value={folderId} onChange={(event) => setFolderId(event.target.value)}><option value="">未分类</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label><div className="tag-field"><span className="field-label">网站标签（所有子链接继承）</span><div className="tag-picker">{tags.map((tag) => <button type="button" key={tag.id} className={selectedTags.includes(tag.id) ? "picked" : ""} onClick={() => setSelectedTags((current) => current.includes(tag.id) ? current.filter((id) => id !== tag.id) : [...current, tag.id])}><span className="tag-dot" style={{ background: tag.color }} />{tag.name}{selectedTags.includes(tag.id) && <Check size={13} />}</button>)}</div></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions">{site && <button type="button" className="secondary-button danger-button" onClick={() => void remove()}>删除网站</button>}<button type="button" className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" disabled={saving}>{saving ? "保存中..." : "保存网站"}</button></div></form></div>;
}

function PublishCollectionModal({ tag, bookmarks, sites, onClose, onSaved }: { tag: TagType; bookmarks: BookmarkType[]; sites: Site[]; onClose: () => void; onSaved: () => void }) {
  const eligible = bookmarks.filter((bookmark) => bookmark.tags.includes(tag.id) || sites.find((site) => site.id === bookmark.siteId)?.tags.includes(tag.id));
  const [name, setName] = useState(tag.name);
  const [description, setDescription] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(() => eligible.map((bookmark) => bookmark.id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault(); setSaving(true); setError("");
    const responseResult = await fromPromise(apiFetch(`/api/v1/tags/${tag.id}/publish`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, description, bookmarkIds: selectedIds }) }), () => ({ code: "NETWORK_ERROR", message: "无法发布合集" }));
    if (!responseResult.ok) { setError(responseResult.error.message); setSaving(false); return; }
    const bodyResult = await fromPromise(responseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }));
    const parsed = bodyResult.ok ? sharedCollectionResponse.safeParse(bodyResult.value) : null;
    if (!responseResult.value.ok || !parsed?.success) { setError(bodyResult.ok && typeof bodyResult.value === "object" && bodyResult.value !== null && "error" in bodyResult.value && typeof bodyResult.value.error === "string" ? bodyResult.value.error : "合集发布失败"); setSaving(false); return; }
    onSaved(); setSaving(false);
  }
  async function unpublish(): Promise<void> {
    if (!tag.collectionId || !window.confirm(`确定取消发布“${tag.name}”合集吗？`)) return;
    const result = await fromPromise(apiFetch(`/api/v1/shared-collections/${tag.collectionId}`, { method: "DELETE" }), () => ({ code: "NETWORK_ERROR", message: "无法取消发布" }));
    if (!result.ok || !result.value.ok) { setError("无法取消发布"); return; }
    onSaved();
  }
  return <div className="modal-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="modal publish-collection-modal" onSubmit={(event) => void submit(event)}><div className="modal-header"><div><p className="eyebrow">公开快照</p><h2>{tag.collectionId ? "同步共享合集" : "发布为共享合集"}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="关闭"><X size={18} /></button></div><label>合集名称<input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required /></label><label>合集描述<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={500} placeholder="说明这个合集适合谁、包含什么" /></label><div className="collection-selection"><div><span className="field-label">选择公开条目</span><span>{selectedIds.length} / {eligible.length}</span></div>{eligible.map((bookmark) => <label className="collection-select-item" key={bookmark.id}><input type="checkbox" checked={selectedIds.includes(bookmark.id)} onChange={() => setSelectedIds((current) => current.includes(bookmark.id) ? current.filter((id) => id !== bookmark.id) : [...current, bookmark.id])} /><img src={bookmark.favicon} alt="" /><span><strong>{bookmark.title}</strong><small>{bookmark.domain}</small></span></label>)}{eligible.length === 0 && <p className="form-error">该标签下还没有可发布的书签。</p>}</div>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions">{tag.collectionId && <button type="button" className="secondary-button danger-button" onClick={() => void unpublish()}>取消发布</button>}<button type="button" className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" disabled={saving || selectedIds.length === 0}>{saving ? "发布中..." : tag.collectionId ? "同步合集" : "发布合集"}</button></div></form></div>;
}

function TagModal({ tag, tags, onClose, onSaved }: { tag: TagType | null; tags: TagType[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(tag?.name || "");
  const [color, setColor] = useState(tag?.color || "#536dfe");
  const [parentId, setParentId] = useState(tag?.parentId || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault(); setSaving(true); setError("");
    const responseResult = await fromPromise(apiFetch(tag ? `/api/v1/tags/${tag.id}` : "/api/v1/tags", { method: tag ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, color, parentId: parentId || null }) }), () => ({ code: "NETWORK_ERROR", message: "无法连接到服务器" }));
    if (!responseResult.ok) { setError(responseResult.error.message); setSaving(false); return; }
    const bodyResult = await fromPromise(responseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }));
    const parsed = bodyResult.ok ? tagResponse.safeParse(bodyResult.value) : null;
    if (!responseResult.value.ok || !parsed?.success) { setError(bodyResult.ok && typeof bodyResult.value === "object" && bodyResult.value !== null && "error" in bodyResult.value && typeof bodyResult.value.error === "string" ? bodyResult.value.error : "标签保存失败"); setSaving(false); return; }
    onSaved(); setSaving(false);
  }
  return <div className="modal-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="modal compact-modal" onSubmit={(event) => void submit(event)}><div className="modal-header"><div><p className="eyebrow">标签管理</p><h2>{tag ? "编辑标签" : "创建标签"}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="关闭"><X size={18} /></button></div><label>名称<input value={name} onChange={(event) => setName(event.target.value)} maxLength={30} required autoFocus /></label><label>父标签<select value={parentId} onChange={(event) => setParentId(event.target.value)}><option value="">顶级标签</option>{tags.filter((item) => !item.parentId && item.id !== tag?.id).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>颜色<div className="color-field"><input type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="标签颜色" /><input value={color} onChange={(event) => setColor(event.target.value)} pattern="#[0-9a-fA-F]{6}" required /></div></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" disabled={saving}>{saving ? "保存中..." : "保存标签"}</button></div></form></div>;
}

function BookmarkCard({ bookmark, tags, onFavorite, onShare, onClick }: { bookmark: BookmarkType; tags: DashboardData["tags"]; onFavorite: () => void; onShare: () => void; onClick: () => void }) { return <article className="bookmark-card" role="listitem"><div className="card-top"><div className="favicon"><img src={bookmark.favicon} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /></div><div className="bookmark-actions"><button type="button" className={`more-button ${bookmark.publicationId ? "shared-active" : ""}`} aria-label={bookmark.publicationId ? "取消分享" : "分享书签"} title={bookmark.publicationId ? "取消分享" : "分享书签"} onClick={onShare}><Share2 size={17} /></button><button type="button" className={`more-button ${bookmark.isFavorite ? "favorite-active" : ""}`} aria-label={bookmark.isFavorite ? "取消收藏" : "收藏书签"} title={bookmark.isFavorite ? "取消收藏" : "收藏书签"} onClick={onFavorite}><Star size={18} fill={bookmark.isFavorite ? "currentColor" : "none"} /></button></div></div><a href={bookmark.url} target="_blank" rel="noreferrer" onClick={onClick}><h3>{bookmark.title}</h3><span className="domain">{bookmark.domain}<ArrowUpRight size={12} /></span></a><p>{bookmark.description}</p><div className="card-bottom"><div className="card-tags">{bookmark.tags.map((id) => <span key={id} style={{ "--tag-color": tagColor(id, tags) } as React.CSSProperties}>#{tags.find((tag) => tag.id === id)?.name}</span>)}</div><span className="clicks"><BarChart3 size={13} />{bookmark.clicks}</span></div></article>; }

function BookmarkListRow({ bookmark, tags, onFavorite, onShare, onClick }: { bookmark: BookmarkType; tags: DashboardData["tags"]; onFavorite: () => void; onShare: () => void; onClick: () => void }) {
  return <article className="bookmark-list-row" role="listitem"><div className="favicon"><img src={bookmark.favicon} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /></div><div className="list-main"><a href={bookmark.url} target="_blank" rel="noreferrer" onClick={onClick}><strong>{bookmark.title}</strong><span className="domain">{bookmark.domain}<ArrowUpRight size={12} /></span></a><p>{bookmark.description || "暂无描述"}</p></div><div className="list-tags">{bookmark.tags.map((id) => <span key={id} style={{ "--tag-color": tagColor(id, tags) } as React.CSSProperties}>#{tags.find((tag) => tag.id === id)?.name}</span>)}</div><span className="clicks"><BarChart3 size={13} />{bookmark.clicks}</span><div className="bookmark-actions"><button type="button" className={`more-button ${bookmark.publicationId ? "shared-active" : ""}`} aria-label={bookmark.publicationId ? "取消分享" : "分享书签"} onClick={onShare}><Share2 size={16} /></button><button type="button" className={`more-button ${bookmark.isFavorite ? "favorite-active" : ""}`} aria-label={bookmark.isFavorite ? "取消收藏" : "收藏书签"} onClick={onFavorite}><Star size={17} fill={bookmark.isFavorite ? "currentColor" : "none"} /></button></div></article>;
}

function BookmarkTable({ bookmarks, folders, tags, onFavorite, onShare, onClick }: { bookmarks: BookmarkType[]; folders: DashboardData["folders"]; tags: DashboardData["tags"]; onFavorite: (bookmark: BookmarkType) => void; onShare: (bookmark: BookmarkType) => void; onClick: (bookmark: BookmarkType) => void }) {
  return <div className="bookmark-table-wrap"><table className="bookmark-table"><thead><tr><th>书签</th><th>目录</th><th>标签</th><th>访问</th><th>添加时间</th><th aria-label="操作" /></tr></thead><tbody>{bookmarks.map((bookmark) => <tr key={bookmark.id}><td><div className="table-title"><div className="favicon"><img src={bookmark.favicon} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /></div><a href={bookmark.url} target="_blank" rel="noreferrer" onClick={() => onClick(bookmark)}><strong>{bookmark.title}</strong><span>{bookmark.domain}</span></a></div></td><td>{folders.find((folder) => folder.id === bookmark.folderId)?.name || "未分类"}</td><td><div className="list-tags">{bookmark.tags.map((id) => <span key={id} style={{ "--tag-color": tagColor(id, tags) } as React.CSSProperties}>#{tags.find((tag) => tag.id === id)?.name}</span>)}</div></td><td><span className="clicks"><BarChart3 size={13} />{bookmark.clicks}</span></td><td>{new Date(bookmark.createdAt).toLocaleDateString("zh-CN")}</td><td><div className="bookmark-actions"><button type="button" className={`more-button ${bookmark.publicationId ? "shared-active" : ""}`} aria-label={bookmark.publicationId ? "取消分享" : "分享书签"} onClick={() => onShare(bookmark)}><Share2 size={15} /></button><button type="button" className={`more-button ${bookmark.isFavorite ? "favorite-active" : ""}`} aria-label={bookmark.isFavorite ? "取消收藏" : "收藏书签"} onClick={() => onFavorite(bookmark)}><Star size={16} fill={bookmark.isFavorite ? "currentColor" : "none"} /></button></div></td></tr>)}</tbody></table></div>;
}

function EditBookmarkModal({ bookmarks, folders, tags, sites, onClose, onSaved }: { bookmarks: BookmarkType[]; folders: DashboardData["folders"]; tags: DashboardData["tags"]; sites: Site[]; onClose: () => void; onSaved: (bookmark: BookmarkType) => void }) {
  const [selectedId, setSelectedId] = useState(bookmarks[0]?.id || "");
  const bookmark = bookmarks.find((item) => item.id === selectedId);
  const [title, setTitle] = useState(bookmark?.title || "");
  const [description, setDescription] = useState(bookmark?.description || "");
  const [siteId, setSiteId] = useState(bookmark?.siteId || "");
  const [folderId, setFolderId] = useState(bookmark?.folderId || folders[0]?.id || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(bookmark?.tags || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bookmark) return;
    setTitle(bookmark.title); setDescription(bookmark.description); setSiteId(bookmark.siteId); setFolderId(bookmark.folderId || ""); setSelectedTags(bookmark.tags);
  }, [bookmark?.id]);

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!bookmark) return;
    setSaving(true); setError("");
    const responseResult = await fromPromise(apiFetch(`/api/v1/bookmarks/${bookmark.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, description, siteId, folderId: folderId || null, tags: selectedTags }) }), () => ({ code: "NETWORK_ERROR", message: "无法连接到服务器" }));
    if (!responseResult.ok) { setError(responseResult.error.message); setSaving(false); return; }
    const bodyResult = await fromPromise(responseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }));
    const parsed = bodyResult.ok ? bookmarkResponse.safeParse(bodyResult.value) : null;
    if (!responseResult.value.ok || !parsed?.success) { setError(bodyResult.ok && typeof bodyResult.value === "object" && bodyResult.value !== null && "error" in bodyResult.value && typeof bodyResult.value.error === "string" ? bodyResult.value.error : "书签保存失败"); setSaving(false); return; }
    onSaved(parsed.data); setSaving(false);
  }

  return <div className="modal-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="modal edit-bookmark-modal" onSubmit={(event) => void submit(event)}><div className="modal-header"><div><p className="eyebrow">当前页面</p><h2>编辑书签</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="关闭"><X size={18} /></button></div><label>选择书签<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{bookmarks.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>{bookmark && <><label>网址<input value={bookmark.url} disabled /></label><label>标题<input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={120} /></label><label>描述<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={500} /></label><label>所属网站<select value={siteId} onChange={(event) => setSiteId(event.target.value)} required>{sites.map((site) => <option value={site.id} key={site.id}>{site.name}</option>)}</select></label><label>子链接目录<select value={folderId} onChange={(event) => setFolderId(event.target.value)}><option value="">继承网站或未分类</option>{folders.map((folder) => <option value={folder.id} key={folder.id}>{folder.name}</option>)}</select></label><div className="tag-field"><span className="field-label">子链接标签</span><div className="bookmark-tag-editor"><div className="selected-tag-list" aria-label="当前标签">{selectedTags.map((id) => { const tag = tags.find((item) => item.id === id); if (!tag) return null; return <span className="selected-tag-chip" key={tag.id} style={{ "--tag-color": tag.color } as React.CSSProperties}><span>#{tag.name}</span><span className="tag-chip-actions"><button type="button" aria-label={`移除标签${tag.name}`} title={`移除标签${tag.name}`} onClick={() => setSelectedTags((current) => current.filter((tagId) => tagId !== tag.id))}><X size={12} /></button></span></span>; })}{selectedTags.length === 0 && <span className="tag-empty">未添加独立标签</span>}</div><div className="tag-picker" aria-label="添加标签">{tags.filter((tag) => !selectedTags.includes(tag.id)).map((tag) => <button type="button" key={tag.id} onClick={() => setSelectedTags((current) => [...current, tag.id])}><span className="tag-dot" style={{ background: tag.color }} />{tag.name}<Plus size={13} /></button>)}</div></div></div></>}{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" disabled={saving}>{saving ? "保存中..." : "保存修改"}</button></div></form></div>;
}

function AddBookmarkModal({ folders, tags, sites, initialSiteId, onClose, onAdded }: { folders: DashboardData["folders"]; tags: DashboardData["tags"]; sites: Site[]; initialSiteId: string | null; onClose: () => void; onAdded: (bookmark: BookmarkType) => void }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [siteId, setSiteId] = useState(initialSiteId || "");
  const [folderId, setFolderId] = useState(folders[0]?.id || "");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    const request = apiFetch("/api/v1/bookmarks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, title: title || undefined, description, siteId: siteId || null, folderId: folderId || null, tags: selectedTags }) });
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
  return <div className="modal-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="modal" onSubmit={submit}><div className="modal-header"><div><p className="eyebrow">新收藏</p><h2>{initialSiteId ? "添加网站子链接" : "添加一个私人书签"}</h2></div><button type="button" className="icon-button" onClick={onClose}><X size={18} /></button></div><label>网址<input required type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/path" autoFocus /></label><label>子链接名称<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：控制台、文档、账单" /></label><label>描述<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="这个子链接用于什么" rows={3} /></label><label>所属网站<select value={siteId} onChange={(event) => setSiteId(event.target.value)} disabled={Boolean(initialSiteId)}><option value="">根据域名自动归站</option>{sites.map((site) => <option value={site.id} key={site.id}>{site.name}</option>)}</select></label><label>子链接目录<select value={folderId} onChange={(event) => setFolderId(event.target.value)}><option value="">继承网站或未分类</option>{folders.map((folder) => <option value={folder.id} key={folder.id}>{folder.name}</option>)}</select></label><label>子链接标签<div className="tag-picker">{tags.map((tag) => <button type="button" key={tag.id} className={selectedTags.includes(tag.id) ? "picked" : ""} onClick={() => setSelectedTags((current) => current.includes(tag.id) ? current.filter((id) => id !== tag.id) : [...current, tag.id])}><span className="tag-dot" style={{ background: tag.color }} />{tag.parentId ? "↳ " : ""}{tag.name}{selectedTags.includes(tag.id) && <Check size={13} />}</button>)}</div></label>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" disabled={saving}>{saving ? "保存中..." : <><Plus size={16} />保存子链接</>}</button></div></form></div>;
}
