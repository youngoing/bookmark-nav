"use client";

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Archive, ArrowUpRight, BarChart3, Bell, Bookmark, BookOpen, Briefcase, CalendarDays, Camera, Check, ChevronLeft, ChevronRight, CircleDot, Cloud, Code2, Compass, Copy, Database, Download, FileText, Film, Flag, Folder, FolderOpen, Gamepad2, Globe2, GraduationCap, Hammer, Headphones, Heart, History, Image, Inbox, KeyRound, Lightbulb, Link, Link2, LoaderCircle, Lock, LayoutGrid, LifeBuoy, List, LogOut, Map as MapIcon, Menu, MessageCircle, Monitor, Music, Package, Palette, PanelLeftClose, PanelLeftOpen, Pencil, Plane, Plus, Rocket, Rows3, Rss, Search, Settings2, Share2, Shield, ShoppingBag, SlidersHorizontal, Sparkles, Star, Tag, Terminal, Table2, ThumbsUp, Trash2, Trophy, Tv, Users, Wallet, Wifi, Wrench, X, type LucideIcon } from "lucide-react";
import type { Bookmark as BookmarkType, DashboardData } from "../lib/types";
import { apiKeyCreatedResponse, apiKeyListResponse, bookmarkBatchWriteResponse, bookmarkPageResponse, bookmarkResponse, dashboardResponse, folderResponse, fromPromise, publicationListResponse, sessionResponse, sharedCollectionListResponse, sharedCollectionResponse, siteResponse, tagResponse, type ApiKeyResponse, type BookmarkPageResponse, type Folder as FolderType, type IconLibrary, type JsonValue, type Publication, type SharedCollection, type Site, type Tag as TagType, type UserResponse } from "@loomark/shared";
import { authClient } from "../lib/auth-client";
import { useTheme } from "./theme-provider";
import { useWorkspaceMode } from "./workspace-mode";
import {
  accountIdentifier,
  apiFetch,
  effectiveTagIds,
  handleBookmarkSurfaceClick,
  handleBookmarkSurfaceKeyDown,
  LibraryIcon,
  LoadingState,
  makeQueryState,
  SESSION_CHECK_TIMEOUT_MS,
  tagColor,
  ThemeSwitcher,
  type ManagementSection,
  type QueryState,
  type TagMatchMode,
} from "./home/shared";

const ManagementWorkspace = lazy(() => import("./home/management-workspace"));
const DialogHost = lazy(() => import("./home/dialogs"));

const initial: DashboardData = { bookmarks: [], folders: [], tags: [], sites: [], totalClicks: 0 };
export default function Home() {
  const { mode, setMode, themeId, setThemeId, refreshPreferences } = useTheme();
  const workspaceMode = useWorkspaceMode();
  const isEditor = workspaceMode === "edit";
  const [user, setUser] = useState<UserResponse | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [data, setData] = useState(initial);
  const [activeFolder, setActiveFolder] = useState("all");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [tagMatchMode, setTagMatchMode] = useState<TagMatchMode>("and");
  const [activeView, setActiveView] = useState<"all" | "visited" | "unorganized" | "favorites" | "sites" | "discover">("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"recent" | "clicks" | "az">("recent");
  const [showAdd, setShowAdd] = useState(false);
  const [addSiteId, setAddSiteId] = useState<string | null>(null);
  const [editingBookmark, setEditingBookmark] = useState<BookmarkType | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [operationMessage, setOperationMessage] = useState<string | null>(null);
  const [showAccount, setShowAccount] = useState(false);
  const [folderEditor, setFolderEditor] = useState<FolderType | "new" | null>(null);
  const [tagEditor, setTagEditor] = useState<TagType | "new" | null>(null);
  const [siteEditor, setSiteEditor] = useState<Site | "new" | null>(null);
  const [publishingTag, setPublishingTag] = useState<TagType | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<"grid" | "circle" | "compact" | "list" | "table">("grid");
  const [pageInfo, setPageInfo] = useState<BookmarkPageResponse>({ items: [], page: 1, pageSize: 9, total: 0, totalPages: 0 });
  const [pageSize, setPageSize] = useState(9);
  const [browsePage, setBrowsePage] = useState(1);
  const [recentlyVisitedIds, setRecentlyVisitedIds] = useState<Set<string>>(() => new Set());
  const [publications, setPublications] = useState<Publication[]>([]);
  const [sharedCollections, setSharedCollections] = useState<SharedCollection[]>([]);
  const [discoverMode, setDiscoverMode] = useState<"collections" | "links">("collections");
  const [managementSection, setManagementSection] = useState<ManagementSection>("bookmarks");
  const [managementQueries, setManagementQueries] = useState<Record<ManagementSection, QueryState>>({
    bookmarks: makeQueryState("view.title"),
    folders: makeQueryState("view.folderName"),
    tags: makeQueryState("view.tagName"),
    sites: makeQueryState("view.siteName"),
    sharing: makeQueryState("view.title"),
  });
  const [savedPublicationIds, setSavedPublicationIds] = useState<Set<string>>(() => new Set());
  const [savedCollectionIds, setSavedCollectionIds] = useState<Set<string>>(() => new Set());
  const pageRequestId = useRef(0);

  function updateManagementQuery(section: ManagementSection, patch: Partial<QueryState>): void {
    setManagementQueries((current) => ({ ...current, [section]: { ...current[section], ...patch } }));
  }

  async function loadSession(): Promise<void> {
    try {
      const responseResult = await fromPromise(apiFetch("/api/auth/session", { cache: "no-store" }, SESSION_CHECK_TIMEOUT_MS), () => ({ code: "NETWORK_ERROR", message: "无法连接到服务器" }));
      if (!responseResult.ok) return;
      const bodyResult = await fromPromise(responseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }));
      if (responseResult.value.ok && bodyResult.ok) {
        const parsed = sessionResponse.safeParse(bodyResult.value);
        if (parsed.success) setUser(parsed.data.user);
      }
    } finally {
      setAuthLoading(false);
    }
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
  useEffect(() => {
    if (!user) return;
    void refreshDashboard();
    void refreshPreferences();
  }, [refreshPreferences, user]);
  async function loadPage(page: number): Promise<void> {
    const requestId = ++pageRequestId.current;
    setPageLoading(true);
    setPageError(null);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), sort });
    if (activeView === "favorites") params.set("favorite", "true");
    if (activeFolder !== "all") params.set("folderId", activeFolder);
    if (activeTags[0]) params.set("tagId", activeTags[0]);
    if (query.trim()) params.set("q", query.trim());
    const responseResult = await fromPromise(apiFetch(`/api/v1/bookmarks/page?${params.toString()}`, { cache: "no-store" }), () => ({ code: "NETWORK_ERROR", message: "无法连接到服务器" }));
    if (!responseResult.ok) {
      if (requestId !== pageRequestId.current) return;
      setPageInfo({ items: [], page: 1, pageSize: 9, total: 0, totalPages: 0 });
      setPageError(responseResult.error.message);
      setPageLoading(false);
      return;
    }
    const bodyResult = await fromPromise(responseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }));
    if (!bodyResult.ok) {
      if (requestId !== pageRequestId.current) return;
      setPageInfo({ items: [], page: 1, pageSize: 9, total: 0, totalPages: 0 });
      setPageError(bodyResult.error.message);
      setPageLoading(false);
      return;
    }
    const parsed = bookmarkPageResponse.safeParse(bodyResult.value);
    if (!responseResult.value.ok || !parsed.success) {
      if (requestId !== pageRequestId.current) return;
      setPageInfo({ items: [], page: 1, pageSize: 9, total: 0, totalPages: 0 });
      setPageError("服务器返回了无法识别的书签数据");
      setPageLoading(false);
      return;
    }
    if (requestId !== pageRequestId.current) return;
    setPageInfo(parsed.data);
    setPageLoading(false);
  }

  async function loadDiscover(): Promise<void> {
    const requestId = ++pageRequestId.current;
    setPageLoading(true);
    setPageError(null);
    const responseResult = await fromPromise(apiFetch("/api/v1/discover", { cache: "no-store" }), () => ({ code: "NETWORK_ERROR", message: "无法连接到服务器" }));
    if (!responseResult.ok) { if (requestId !== pageRequestId.current) return; setPageError(responseResult.error.message); setPageLoading(false); return; }
    const bodyResult = await fromPromise(responseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }));
    const parsed = bodyResult.ok ? publicationListResponse.safeParse(bodyResult.value) : null;
    if (!responseResult.value.ok || !parsed?.success) { if (requestId !== pageRequestId.current) return; setPageError("无法加载其他用户的分享"); setPageLoading(false); return; }
    if (requestId !== pageRequestId.current) return;
    setPublications(parsed.data);
    const collectionResponseResult = await fromPromise(apiFetch("/api/v1/discover/collections", { cache: "no-store" }), () => ({ code: "NETWORK_ERROR", message: "无法连接到服务器" }));
    if (!collectionResponseResult.ok) { if (requestId !== pageRequestId.current) return; setPageError(collectionResponseResult.error.message); setPageLoading(false); return; }
    const collectionBodyResult = await fromPromise(collectionResponseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }));
    const parsedCollections = collectionBodyResult.ok ? sharedCollectionListResponse.safeParse(collectionBodyResult.value) : null;
    if (!collectionResponseResult.value.ok || !parsedCollections?.success) { if (requestId !== pageRequestId.current) return; setPageError("无法加载共享合集"); setPageLoading(false); return; }
    if (requestId !== pageRequestId.current) return;
    setSharedCollections(parsedCollections.data);
    setPageLoading(false);
  }

  useEffect(() => {
    if (activeView === "discover") void loadDiscover();
  }, [activeView, user]);
  useEffect(() => {
    if (!user || !isEditor || managementSection !== "sharing") return;
    void loadDiscover();
  }, [isEditor, managementSection, user]);

  const visible = pageInfo.items;
  const browseItems = useMemo(() => {
    if (activeView === "sites" || activeView === "discover") return [];
    const search = query.trim().toLocaleLowerCase();
    return [...data.bookmarks].filter((bookmark) => {
      const site = data.sites.find((item) => item.id === bookmark.siteId);
      const folderMatched = activeFolder === "all" || bookmark.folderId === activeFolder || site?.folderId === activeFolder;
      const tagIds = effectiveTagIds(bookmark, data.sites);
      const tagMatched = activeTags.length === 0 || (tagMatchMode === "and" ? activeTags.every((tagId) => tagIds.includes(tagId)) : activeTags.some((tagId) => tagIds.includes(tagId)));
      const tagCount = effectiveTagIds(bookmark, data.sites).length;
      const viewMatched = activeView === "favorites" ? bookmark.isFavorite : activeView === "visited" ? recentlyVisitedIds.has(bookmark.id) : activeView !== "unorganized" || !bookmark.folderId || tagCount === 0;
      const searchMatched = !search || [bookmark.title, bookmark.domain, bookmark.description].some((value) => value.toLocaleLowerCase().includes(search));
      return folderMatched && tagMatched && viewMatched && searchMatched;
    }).sort((a, b) => activeView === "visited" ? Array.from(recentlyVisitedIds).indexOf(a.id) - Array.from(recentlyVisitedIds).indexOf(b.id) : sort === "recent" ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() : sort === "clicks" ? b.clicks - a.clicks : a.title.localeCompare(b.title));
  }, [activeFolder, activeTags, activeView, data.bookmarks, data.sites, query, recentlyVisitedIds, sort, tagMatchMode]);
  useEffect(() => {
    const totalPages = browseItems.length ? Math.ceil(browseItems.length / pageSize) : 0;
    const page = totalPages ? Math.min(browsePage, totalPages) : 1;
    if (page !== browsePage) setBrowsePage(page);
    setPageInfo({ items: browseItems.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total: browseItems.length, totalPages });
    setPageLoading(false);
  }, [browseItems, browsePage, pageSize]);
  const folderName = activeView === "visited" ? "最近访问" : activeView === "unorganized" ? "未整理" : activeView === "favorites" ? "我的收藏" : activeView === "sites" ? "网站" : activeView === "discover" ? "发现" : data.folders.find((folder) => folder.id === activeFolder)?.name || "全部书签";
  const isBookmarkEditor = isEditor && activeView !== "sites" && activeView !== "discover";
  const hasFixedPagination = !isBookmarkEditor && activeView !== "sites" && activeView !== "discover" && !loading && !pageLoading && !pageError && visible.length > 0 && pageInfo.totalPages > 0;
  const displaySurfaceRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!user || activeView === "sites" || activeView === "discover") return;
    const updatePageSize = () => {
      const width = displaySurfaceRef.current?.clientWidth || window.innerWidth - (sidebarCollapsed ? 72 : 245) - 64;
      const columnWidth = displayMode === "circle" ? (window.innerWidth <= 760 ? 82 : 112) : displayMode === "grid" ? 240 : width;
      const columns = Math.max(1, Math.floor(width / columnWidth));
      const rowHeight = displayMode === "circle" ? 104 : displayMode === "grid" ? 198 : displayMode === "compact" ? 47 : displayMode === "list" ? 74 : 62;
      const rows = Math.max(1, Math.floor(Math.max(rowHeight, window.innerHeight - 320) / rowHeight));
      const next = Math.min(50, Math.max(1, columns * rows));
      setPageSize((current) => current === next ? current : next);
    };
    updatePageSize();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePageSize);
    if (displaySurfaceRef.current && observer) observer.observe(displaySurfaceRef.current);
    window.addEventListener("resize", updatePageSize);
    return () => { observer?.disconnect(); window.removeEventListener("resize", updatePageSize); };
  }, [activeView, displayMode, sidebarCollapsed, user, isEditor]);
  useEffect(() => {
    const savedDisplayMode = window.localStorage.getItem("bookmark-nav-display-mode");
    if (savedDisplayMode === "circle" || savedDisplayMode === "compact" || savedDisplayMode === "list" || savedDisplayMode === "table")
      setDisplayMode(savedDisplayMode);
    const savedVisited = window.localStorage.getItem("bookmark-nav-recently-visited");
    if (savedVisited) {
      try {
        const parsed: unknown = JSON.parse(savedVisited);
        if (Array.isArray(parsed))
          setRecentlyVisitedIds(new Set(parsed.filter((id): id is string => typeof id === "string")));
      } catch {
        // Ignore malformed local browser state and keep the empty default.
      }
    }
  }, []);
  useEffect(() => { window.localStorage.setItem("bookmark-nav-display-mode", displayMode); }, [displayMode]);

  function switchWorkspaceView(view: typeof activeView, folder = "all", tag: string | null = null): void {
    setActiveView(view);
    setActiveFolder(folder);
     setActiveTags(tag ? [tag] : []);
    setQuery("");
     setBrowsePage(1);
    setMobileNav(false);
  }

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

    setRecentlyVisitedIds((current) => {
      const next = new Set([updatedBookmark.id, ...current]);
      window.localStorage.setItem("bookmark-nav-recently-visited", JSON.stringify(Array.from(next).slice(0, 50)));
      return next;
    });

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
    await refreshDashboard();
  }
  async function deleteTag(tag: TagType): Promise<void> {
    const responseResult = await fromPromise(apiFetch(`/api/v1/tags/${tag.id}`, { method: "DELETE" }), () => ({ code: "NETWORK_ERROR", message: "无法删除标签" }));
    if (!responseResult.ok) return;
    const bodyResult = await fromPromise(responseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }));
    if (!responseResult.value.ok || !bodyResult.ok || !tagResponse.safeParse(bodyResult.value).success) return;
    setActiveTags((current) => current.filter((id) => id !== tag.id));
    await refreshDashboard();
  }
  async function deleteBookmark(bookmark: BookmarkType): Promise<void> {
    if (!window.confirm(`确定删除“${bookmark.title}”吗？`)) return;
    const responseResult = await fromPromise(apiFetch(`/api/v1/bookmarks/${bookmark.id}`, { method: "DELETE" }), () => ({ code: "NETWORK_ERROR", message: "无法删除书签" }));
    if (!responseResult.ok) return;
    const bodyResult = await fromPromise(responseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }));
    if (!responseResult.value.ok || !bodyResult.ok || typeof bodyResult.value !== "object" || bodyResult.value === null || Array.isArray(bodyResult.value) || !("deleted" in bodyResult.value) || bodyResult.value.deleted !== true) return;
    setEditingBookmark(null);
    setData((current) => ({ ...current, bookmarks: current.bookmarks.filter((item) => item.id !== bookmark.id) }));
    setPageInfo((current) => ({ ...current, items: current.items.filter((item) => item.id !== bookmark.id), total: Math.max(0, current.total - 1) }));
    await refreshDashboard();
  }
  async function toggleFavorite(bookmark: BookmarkType): Promise<void> {
    const responseResult = await fromPromise(apiFetch(`/api/v1/bookmarks/${bookmark.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ isFavorite: !bookmark.isFavorite }) }), () => ({ code: "NETWORK_ERROR", message: "无法更新收藏" }));
    if (!responseResult.ok) return;
    const bodyResult = await fromPromise(responseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }));
    const parsed = bodyResult.ok ? bookmarkResponse.safeParse(bodyResult.value) : null;
    if (!responseResult.value.ok || !parsed?.success) return;
    setPageInfo((current) => ({ ...current, items: current.items.map((item) => item.id === bookmark.id ? parsed.data : item) }));
    await refreshDashboard();
  }

  async function toggleShare(bookmark: BookmarkType): Promise<void> {
    if (bookmark.publicationId && !window.confirm(`确定停止分享“${bookmark.title}”吗？`)) return;
    const responseResult = await fromPromise(apiFetch(`/api/v1/bookmarks/${bookmark.id}/share`, { method: bookmark.publicationId ? "DELETE" : "POST" }), () => ({ code: "NETWORK_ERROR", message: "无法更新分享状态" }));
    if (!responseResult.ok || !responseResult.value.ok) return;
    await refreshDashboard();
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
    if (loggingOut) return;
    setLoggingOut(true);
    const result = await fromPromise(apiFetch("/api/auth/sign-out", { method: "POST" }), () => ({ code: "NETWORK_ERROR", message: "无法退出登录" }));
    if (!result.ok || !result.value.ok) {
      setOperationMessage(result.ok ? "退出登录失败，请稍后重试" : result.error.message);
      window.setTimeout(() => setOperationMessage(null), 4000);
      setLoggingOut(false);
      return;
    }
    setUser(null); setShowMenu(false); setData(initial); setPageInfo({ items: [], page: 1, pageSize: 9, total: 0, totalPages: 0 });
    setLoggingOut(false);
  }

  if (authLoading) return <main className="auth-shell"><div className="auth-status" role="status" aria-live="polite"><span className="auth-status-mark"><Bookmark size={17} strokeWidth={2.5} /></span><div><strong>正在恢复登录状态</strong><span>请稍候</span></div><LoaderCircle className="auth-status-loader" size={18} aria-hidden="true" /></div></main>;
  if (!user) return <LoginScreen onLoggedIn={setUser} />;

  const editableFolders = data.folders.filter((folder) => folder.id !== "all");
  const hasOpenDialog = showAdd || editingBookmark !== null || showAccount || folderEditor !== null || tagEditor !== null || siteEditor !== null || publishingTag !== null;
  const dialogHost = hasOpenDialog ? <Suspense fallback={null}><DialogHost user={user} showAdd={showAdd} initialSiteId={addSiteId} editingBookmark={editingBookmark} showAccount={showAccount} folderEditor={folderEditor} tagEditor={tagEditor} siteEditor={siteEditor} publishingTag={publishingTag} folders={editableFolders} tags={data.tags} sites={data.sites} bookmarks={data.bookmarks} onCloseAdd={() => { setShowAdd(false); setAddSiteId(null); }} onAdded={handleAdd} onCloseEditBookmark={() => setEditingBookmark(null)} onBookmarkSaved={(updated) => { setEditingBookmark(null); setPageInfo((current) => ({ ...current, items: current.items.map((item) => item.id === updated.id ? updated : item) })); setData((current) => ({ ...current, bookmarks: current.bookmarks.map((item) => item.id === updated.id ? updated : item) })); void refreshDashboard(); }} onCloseAccount={() => setShowAccount(false)} onAccountSaved={(updated) => { setUser(updated); setShowAccount(false); }} onCloseFolder={() => setFolderEditor(null)} onFolderSaved={() => { setFolderEditor(null); void refreshDashboard(); }} onCloseTag={() => setTagEditor(null)} onTagSaved={() => { setTagEditor(null); void refreshDashboard(); }} onCloseSite={() => setSiteEditor(null)} onSiteSaved={() => { setSiteEditor(null); void refreshDashboard(); }} onClosePublishCollection={() => setPublishingTag(null)} onPublishCollectionSaved={() => { setPublishingTag(null); void refreshDashboard(); }} /></Suspense> : null;

  if (isEditor) return <>
    <Suspense fallback={<LoadingState />}><ManagementWorkspace operationMessage={operationMessage} data={data} user={user} mode={mode} setMode={setMode} themeId={themeId} setThemeId={setThemeId} sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={setSidebarCollapsed} managementSection={managementSection} setManagementSection={setManagementSection} managementQueries={managementQueries} updateManagementQuery={updateManagementQuery} query={query} setQuery={setQuery} sort={sort} setSort={setSort} loading={loading} pageLoading={pageLoading} pageError={pageError} publications={publications} sharedCollections={sharedCollections} savedPublicationIds={savedPublicationIds} savedCollectionIds={savedCollectionIds} discoverMode={discoverMode} setDiscoverMode={setDiscoverMode} showMenu={showMenu} setShowMenu={setShowMenu} loggingOut={loggingOut} logout={() => void logout()} openAddBookmark={openAddBookmark} setShowAccount={setShowAccount} setEditingBookmark={setEditingBookmark} setFolderEditor={setFolderEditor} setTagEditor={setTagEditor} setSiteEditor={setSiteEditor} setPublishingTag={setPublishingTag} toggleFavorite={(bookmark) => void toggleFavorite(bookmark)} toggleShare={(bookmark) => void toggleShare(bookmark)} deleteBookmark={(bookmark) => void deleteBookmark(bookmark)} deleteTag={(tag) => void deleteTag(tag)} refreshDashboard={() => void refreshDashboard()} loadPage={(page) => void loadPage(page)} loadDiscover={() => void loadDiscover()} saveSharedBookmark={(publication) => void saveSharedBookmark(publication)} saveCollection={(collection) => void saveCollection(collection)} /></Suspense>
    {dialogHost}
  </>;

  return <div className={`shell ${sidebarCollapsed ? "sidebar-is-collapsed" : ""}`}>
    {operationMessage && <div className="operation-toast" role="status">{operationMessage}</div>}
    <aside className={`sidebar ${mobileNav ? "mobile-open" : ""} ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <div className="brand"><span className="brand-mark"><Bookmark size={17} strokeWidth={2.6} /></span><span>bookmark-nav</span><button type="button" className="icon-button sidebar-toggle" onClick={() => setSidebarCollapsed((current) => !current)} aria-label={sidebarCollapsed ? "展开导航" : "收起导航"} title={sidebarCollapsed ? "展开导航" : "收起导航"}>{sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button><button type="button" className="icon-button sidebar-close" onClick={() => setMobileNav(false)} aria-label="关闭导航"><X size={18} /></button></div>
      <nav className="nav">
        <p className="nav-label">个人空间</p>
         <button type="button" className={`nav-item ${activeView === "all" && activeFolder === "all" && !activeTags.length ? "selected" : ""}`} onClick={() => switchWorkspaceView("all")}><LayoutGrid size={17} />我的书签<span className="nav-count">{data.bookmarks.length}</span></button>
         <button type="button" className={`nav-item ${activeView === "visited" ? "selected" : ""}`} onClick={() => switchWorkspaceView("visited")}><History size={17} />最近访问<span className="nav-count">{data.bookmarks.filter((bookmark) => recentlyVisitedIds.has(bookmark.id)).length}</span></button>
         <button type="button" className={`nav-item ${activeView === "unorganized" ? "selected" : ""}`} onClick={() => switchWorkspaceView("unorganized")}><Inbox size={17} />未整理<span className="nav-count">{data.bookmarks.filter((bookmark) => !bookmark.folderId || effectiveTagIds(bookmark, data.sites).length === 0).length}</span></button>
        <button type="button" className={`nav-item ${activeView === "favorites" ? "selected" : ""}`} onClick={() => switchWorkspaceView("favorites")}><Star size={17} />我的收藏<span className="nav-count">{data.bookmarks.filter((bookmark) => bookmark.isFavorite).length}</span></button>
         <button type="button" className={`nav-item ${activeView === "sites" ? "selected" : ""}`} onClick={() => switchWorkspaceView("sites")}><Globe2 size={17} />网站<span className="nav-count">{data.sites.length}</span></button>
         <p className="nav-label folder-label">常用标签</p>
         {data.tags.slice().sort((a, b) => b.count - a.count).slice(0, 5).map((tag) => <button type="button" key={tag.id} className={`nav-item ${activeTags.length === 1 && activeTags[0] === tag.id ? "selected" : ""}`} onClick={() => switchWorkspaceView("all", "all", tag.id)}><span className="tag-dot" style={{ background: tag.color }} />{tag.name}<span className="nav-count">{tag.count}</span></button>)}
         <p className="nav-label folder-label">共享空间</p>
        <button type="button" className={`nav-item ${activeView === "discover" ? "selected" : ""}`} onClick={() => switchWorkspaceView("discover")}><Compass size={17} />发现</button>
       </nav>
      <div className="sidebar-bottom"><ThemeSwitcher mode={mode} setMode={setMode} themeId={themeId} setThemeId={setThemeId} /></div>
    </aside>
    {mobileNav && <button type="button" className="backdrop" onClick={() => setMobileNav(false)} aria-label="关闭导航" />}
    <main className="main">
       <header className="topbar"><button type="button" className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="打开导航"><Menu size={20} /></button><div className="breadcrumbs"><span>{isEditor ? "编辑" : "工作台"}</span><span>/</span><strong>{folderName}</strong>{activeTags.length > 0 && <><span>/</span><strong className="crumb-tag">{activeTags.map((tagId) => `#${data.tags.find((tag) => tag.id === tagId)?.name}`).join(" ")}</strong></>}</div><div className="top-actions"><div className="top-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索书签..." /><kbd>⌘ K</kbd></div>{isEditor ? <a className="icon-button" href="/" title="返回主页" aria-label="返回主页"><LayoutGrid size={18} /></a> : <a className="icon-button" href="/edit" title="进入编辑页" aria-label="进入编辑页"><Pencil size={18} /></a>}<div className="menu-wrap"><button type="button" className="avatar mini" onClick={() => setShowMenu(!showMenu)} aria-label="打开账号菜单">{user.name.slice(0, 1).toUpperCase()}</button>{showMenu && <div className="user-menu"><strong>{user.name}</strong><span>{accountIdentifier(user.email)}</span><hr /><button type="button" onClick={() => { setShowAccount(true); setShowMenu(false); }}><Settings2 size={15} />账号设置</button><button type="button" disabled={loggingOut} onClick={() => void logout()}><LogOut size={15} />{loggingOut ? "退出中..." : "退出登录"}</button></div>}</div></div></header>
      <section className={`content ${hasFixedPagination ? "has-fixed-pagination" : ""}`}>
         {activeView === "discover" ? <>
          <div className="section-heading"><div><h2>{discoverMode === "collections" ? "共享合集" : "单条分享"}</h2><span>{discoverMode === "collections" ? sharedCollections.length : publications.length} 个公开内容</span></div><div className="discovery-tabs" role="tablist" aria-label="发现内容类型"><button role="tab" aria-selected={discoverMode === "collections"} className={discoverMode === "collections" ? "active" : ""} onClick={() => setDiscoverMode("collections")}>共享合集</button><button role="tab" aria-selected={discoverMode === "links"} className={discoverMode === "links" ? "active" : ""} onClick={() => setDiscoverMode("links")}>单条分享</button></div></div>
          {pageLoading ? <LoadingState /> : pageError ? <div className="empty"><Archive size={30} /><strong>分享加载失败</strong><span>{pageError}</span><button className="secondary-button" onClick={() => void loadDiscover()}>重新加载</button></div> : discoverMode === "collections" ? sharedCollections.length ? <SharedCollectionGrid collections={sharedCollections} savedIds={savedCollectionIds} canSave={isEditor} onSave={(collection) => void saveCollection(collection)} /> : <div className="empty"><Compass size={30} /><strong>暂时没有共享合集</strong><span>用户将个人标签发布为合集后会展示在这里。</span></div> : publications.length ? <DiscoveryGrid publications={publications} savedIds={savedPublicationIds} canSave={isEditor} onSave={(publication) => void saveSharedBookmark(publication)} /> : <div className="empty"><Compass size={30} /><strong>暂时没有单条分享</strong><span>个人书签不会出现在这里，只有主动分享的内容才会展示。</span></div>}
        </> : activeView === "sites" ? <>
          <div className="section-heading"><div><h2>网站</h2><span>{data.sites.length} 个网站</span></div>{isEditor && <button className="secondary-button" onClick={() => setSiteEditor("new")}><Plus size={15} />新建网站</button>}</div>
          <SiteGroups sites={data.sites} bookmarks={data.bookmarks} tags={data.tags} editable={isEditor} onAddLink={(siteId) => openAddBookmark(siteId)} onEdit={setSiteEditor} />
        </> : <>
           <div className="section-heading bookmark-section-heading"><div className="bookmark-section-context"><div className="bookmark-section-title"><h2>{activeTags.length ? activeTags.map((tagId) => `#${data.tags.find((tag) => tag.id === tagId)?.name}`).join(" ") : folderName}</h2><span>{pageInfo.total} 个书签</span></div><TopCategoryFilter folders={data.folders} tags={data.tags} activeFolder={activeFolder} activeTags={activeTags} tagMatchMode={tagMatchMode} onFolderSelect={(folder) => { setActiveView("all"); setActiveFolder(folder); setQuery(""); setBrowsePage(1); setMobileNav(false); }} onTagSelect={(tags) => { setActiveView("all"); setActiveTags(tags); setQuery(""); setBrowsePage(1); setMobileNav(false); }} onTagMatchModeChange={setTagMatchMode} /></div><div className="view-actions"><div className="sort-wrap"><SlidersHorizontal size={15} /><select aria-label="书签排序" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="recent">最近添加</option><option value="clicks">访问最多</option><option value="az">名称排序</option></select></div>{!isEditor && <div className="display-toggle" aria-label="展示方式"><button type="button" className={displayMode === "grid" ? "active" : ""} onClick={() => setDisplayMode("grid")} title="大图展示" aria-label="大图展示"><LayoutGrid size={16} /></button><button type="button" className={displayMode === "circle" ? "active" : ""} onClick={() => setDisplayMode("circle")} title="圆圈展示" aria-label="圆圈展示"><CircleDot size={16} /></button><button type="button" className={displayMode === "compact" ? "active" : ""} onClick={() => setDisplayMode("compact")} title="细列表展示" aria-label="细列表展示"><Rows3 size={16} /></button><button type="button" className={displayMode === "list" ? "active" : ""} onClick={() => setDisplayMode("list")} title="列表展示" aria-label="细列表展示"><List size={16} /></button><button type="button" className={displayMode === "table" ? "active" : ""} onClick={() => setDisplayMode("table")} title="表格展示" aria-label="表格展示"><Table2 size={16} /></button></div>}{isEditor && <button type="button" className="icon-button" onClick={() => openAddBookmark()} title="添加书签" aria-label="添加书签"><Plus size={18} /></button>}</div></div>
          {isBookmarkEditor ? pageLoading ? <LoadingState /> : pageError ? <div className="empty"><Archive size={30} /><strong>书签加载失败</strong><span>{pageError}</span><button className="secondary-button" onClick={() => void loadPage(pageInfo.page)}>重新加载</button></div> : visible.length ? <BookmarkEditMode bookmarks={visible} onEdit={setEditingBookmark} onDelete={(bookmark) => void deleteBookmark(bookmark)} onFavorite={(bookmark) => void toggleFavorite(bookmark)} onShare={(bookmark) => void toggleShare(bookmark)} /> : <div className="empty"><Archive size={30} /><strong>{activeView === "favorites" ? "还没有收藏的书签" : "还没有匹配的书签"}</strong><span>{activeView === "favorites" ? "先回到全部书签收藏内容" : "试试其他关键词或添加一个新书签"}</span><button className="primary-button" onClick={() => openAddBookmark()}><Plus size={16} />添加书签</button></div> : loading || pageLoading ? <LoadingState /> : pageError ? <div className="empty"><Archive size={30} /><strong>书签加载失败</strong><span>{pageError}</span><button className="secondary-button" onClick={() => void loadPage(pageInfo.page)}>重新加载</button></div> : visible.length ? <>
             <div className="bookmark-display-surface" ref={displaySurfaceRef}>
             {displayMode === "grid" && <div className="bookmark-grid" role="list" aria-label="大图书签">{visible.map((bookmark) => <BookmarkCard key={bookmark.id} bookmark={bookmark} tags={data.tags} sites={data.sites} onFavorite={() => void toggleFavorite(bookmark)} onShare={() => void toggleShare(bookmark)} onClick={() => clickBookmark(bookmark)} />)}</div>}
            {displayMode === "circle" && <div className="bookmark-circle-grid" role="list" aria-label="圆圈书签">{visible.map((bookmark) => <BookmarkCircle key={bookmark.id} bookmark={bookmark} onClick={() => clickBookmark(bookmark)} />)}</div>}
            {displayMode === "compact" && <div className="bookmark-compact-list" role="list" aria-label="细列表书签">{visible.map((bookmark) => <BookmarkCompactRow key={bookmark.id} bookmark={bookmark} onClick={() => clickBookmark(bookmark)} />)}</div>}
            {displayMode === "list" && <div className="bookmark-list" role="list" aria-label="列表书签">{visible.map((bookmark) => <BookmarkListRow key={bookmark.id} bookmark={bookmark} tags={data.tags} sites={data.sites} onFavorite={() => void toggleFavorite(bookmark)} onShare={() => void toggleShare(bookmark)} onClick={() => clickBookmark(bookmark)} />)}</div>}
             {displayMode === "table" && <BookmarkTable bookmarks={visible} folders={data.folders} tags={data.tags} sites={data.sites} onFavorite={toggleFavorite} onShare={toggleShare} onClick={clickBookmark} />}
             </div>
          </> : <div className="empty"><Archive size={30} /><strong>{activeView === "favorites" ? "还没有收藏的书签" : "还没有匹配的书签"}</strong><span>{activeView === "favorites" ? "收藏操作请进入编辑页完成" : "试试其他关键词，或进入编辑页添加新书签"}</span><a className="primary-button" href="/edit"><Pencil size={16} />进入编辑页</a></div>}
        </>}
        <footer><span>已同步 · 刚刚</span><span><Link2 size={13} /> API 已就绪</span></footer>
      </section>
      {hasFixedPagination && <nav className="pagination fixed-pagination" aria-label="书签分页"><span>第 {pageInfo.page} / {pageInfo.totalPages} 页，共 {pageInfo.total} 个</span><div><button className="icon-button" disabled={pageInfo.page <= 1} onClick={() => setBrowsePage((current) => Math.max(1, current - 1))} title="上一页" aria-label="上一页"><ChevronLeft size={17} /></button><button className="icon-button" disabled={pageInfo.page >= pageInfo.totalPages} onClick={() => setBrowsePage((current) => current + 1)} title="下一页" aria-label="下一页"><ChevronRight size={17} /></button></div></nav>}
    </main>
    {dialogHost}
  </div>;
}

function DiscoveryGrid({ publications, savedIds, canSave, onSave }: { publications: Publication[]; savedIds: Set<string>; canSave: boolean; onSave: (publication: Publication) => void }) {
  return <div className="bookmark-grid discovery-grid">{publications.map((publication) => <article className="bookmark-card discovery-card" key={publication.id} tabIndex={0} aria-label={`打开共享书签 ${publication.title}`} onClick={(event) => handleBookmarkSurfaceClick(event, publication.url, () => {})} onKeyDown={(event) => handleBookmarkSurfaceKeyDown(event, publication.url, () => {})}><div className="card-top"><div className="favicon"><img src={publication.favicon} alt="" /></div><span className="shared-author">{publication.author.name}</span></div><a href={publication.url} target="_blank" rel="noreferrer"><h3>{publication.title}</h3><span className="domain">{publication.domain}<ArrowUpRight size={12} /></span></a><p>{publication.description || "分享者没有添加描述"}</p><div className="card-bottom"><span className="published-at">{new Date(publication.publishedAt).toLocaleDateString("zh-CN")}</span>{canSave && <button className="secondary-button save-shared" disabled={savedIds.has(publication.id)} onClick={() => onSave(publication)}><Plus size={14} />{savedIds.has(publication.id) ? "已保存" : "保存到我的书签"}</button>}</div></article>)}</div>;
}

function SharedCollectionGrid({ collections, savedIds, canSave, onSave }: { collections: SharedCollection[]; savedIds: Set<string>; canSave: boolean; onSave: (collection: SharedCollection) => void }) {
  return <div className="collection-grid">{collections.map((collection) => <article className="shared-collection-card" key={collection.id}><header><div><span className="shared-author">{collection.author.name}</span><h3>{collection.name}</h3></div><span className="collection-count">{collection.items.length} 条</span></header><p>{collection.description || "作者没有添加合集描述"}</p><div className="collection-preview">{collection.items.slice(0, 4).map((item) => <a href={item.url} target="_blank" rel="noreferrer" key={item.id}><img src={item.favicon} alt="" /><span>{item.title}</span><ArrowUpRight size={12} /></a>)}</div><footer><span>{new Date(collection.updatedAt).toLocaleDateString("zh-CN")} 更新</span>{canSave && <button className="primary-button" disabled={savedIds.has(collection.id)} onClick={() => onSave(collection)}><Plus size={14} />{savedIds.has(collection.id) ? "已保存" : "保存整个合集"}</button>}</footer></article>)}</div>;
}

function SiteGroups({ sites, bookmarks, tags, editable, onAddLink, onEdit }: { sites: Site[]; bookmarks: BookmarkType[]; tags: TagType[]; editable: boolean; onAddLink: (siteId: string) => void; onEdit: (site: Site) => void }) {
  if (!sites.length) return <div className="empty"><Globe2 size={30} /><strong>还没有网站</strong><span>新建网站，或添加书签时让系统自动归站。</span></div>;
  return <div className="site-groups">{sites.map((site) => { const items = bookmarks.filter((bookmark) => bookmark.siteId === site.id); return <section className="site-group" key={site.id}><header><div className="favicon"><img src={site.favicon} alt="" /></div><div><strong>{site.name}</strong><span>{site.domain} · {items.length} 个子链接</span></div>{editable && <div className="site-actions"><button className="icon-button" onClick={() => onEdit(site)} title={`编辑${site.name}`} aria-label={`编辑${site.name}`}><Pencil size={14} /></button><button className="icon-button" onClick={() => onAddLink(site.id)} title={`为${site.name}添加子链接`} aria-label={`为${site.name}添加子链接`}><Plus size={15} /></button></div>}</header>{site.tags.length > 0 && <div className="site-tags">{site.tags.map((id) => { const tag = tags.find((item) => item.id === id); return tag ? <span key={id} style={{ "--tag-color": tag.color } as React.CSSProperties}>#{tag.name}</span> : null; })}</div>}<div className="site-links">{items.map((bookmark) => <a href={bookmark.url} target="_blank" rel="noreferrer" key={bookmark.id}><span>{bookmark.title}</span><ArrowUpRight size={13} /></a>)}</div></section>; })}</div>;
}

function TopCategoryFilter({ folders, tags, activeFolder, activeTags, tagMatchMode, onFolderSelect, onTagSelect, onTagMatchModeChange }: { folders: DashboardData["folders"]; tags: TagType[]; activeFolder: string; activeTags: string[]; tagMatchMode: TagMatchMode; onFolderSelect: (folder: string) => void; onTagSelect: (tags: string[]) => void; onTagMatchModeChange: (mode: TagMatchMode) => void }) {
  const [panel, setPanel] = useState<"folders" | "tags" | null>(null);
  const [folderSearch, setFolderSearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [draftTags, setDraftTags] = useState(activeTags);
  const [draftTagMatchMode, setDraftTagMatchMode] = useState(tagMatchMode);
  const panelRef = useRef<HTMLDivElement>(null);
  const matchingFolders = folders.filter((folder) => folder.id === "all" || folder.name.toLocaleLowerCase().includes(folderSearch.trim().toLocaleLowerCase()));
  const matchingTags = tags.filter((tag) => tag.name.toLocaleLowerCase().includes(tagSearch.trim().toLocaleLowerCase()));
  const activeTagNames = activeTags.map((id) => tags.find((tag) => tag.id === id)?.name).filter((name): name is string => Boolean(name));
  const togglePanel = (next: "folders" | "tags") => {
    setFolderSearch("");
    setTagSearch("");
    if (next === "tags") { setDraftTags(activeTags); setDraftTagMatchMode(tagMatchMode); }
    setPanel((current) => current === next ? null : next);
  };
  useEffect(() => {
    if (!panel) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (panelRef.current?.contains(event.target as Node)) return;
      setDraftTags(activeTags);
      setDraftTagMatchMode(tagMatchMode);
      setPanel(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setDraftTags(activeTags); setDraftTagMatchMode(tagMatchMode); setPanel(null); }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [activeTags, panel, tagMatchMode]);
  const activeFolderName = activeFolder === "all" ? "全部" : folders.find((folder) => folder.id === activeFolder)?.name || "全部";
  const activeTagName = activeTagNames.length === 0 ? "全部" : activeTagNames.length === 1 ? activeTagNames[0] : `${activeTagNames[0]} +${activeTagNames.length - 1}`;
  return <div className="bookmark-filter-bar" ref={panelRef} aria-label="目录和标签筛选"><div className="category-summary"><button type="button" className={`category-selector ${panel === "folders" || activeFolder !== "all" ? "active" : ""}`} aria-expanded={panel === "folders"} onClick={() => togglePanel("folders")}><Folder size={14} /><span>目录</span><span className="category-selection" title={activeFolderName}>{activeFolderName}</span><small>{folders.filter((folder) => folder.id !== "all").length}</small></button><button type="button" className={`category-selector ${panel === "tags" || activeTags.length > 0 ? "active" : ""}`} aria-expanded={panel === "tags"} onClick={() => togglePanel("tags")}><Tag size={14} /><span>标签</span><span className="category-selection" title={activeTagNames.join("、") || "全部"}>{activeTagName}</span><small>{tags.length}</small></button></div>{panel && <div className="category-panel" role="dialog" aria-label={panel === "folders" ? "选择目录" : "选择标签"}>{panel === "folders" ? <><div className="category-panel-header"><div><span>目录</span><strong>选择目录</strong></div><small>{folders.filter((folder) => folder.id !== "all").length} 个目录</small></div><input className="category-panel-search" value={folderSearch} onChange={(event) => setFolderSearch(event.target.value)} placeholder="搜索目录" aria-label="搜索目录" autoFocus /><div className="category-panel-list">{matchingFolders.map((folder) => <button type="button" key={folder.id} className={activeFolder === folder.id ? "active" : ""} onClick={() => { onFolderSelect(folder.id); setPanel(null); }}>{folder.id === "all" ? <LayoutGrid size={15} /> : <LibraryIcon library={folder.iconLibrary} name={folder.iconName} size={15} />}<span>{folder.id === "all" ? "全部目录" : folder.name}</span><small>{folder.count}</small>{activeFolder === folder.id && <Check className="category-option-check" size={14} />}</button>)}</div></> : <><div className="category-panel-header"><div><span>标签</span><strong>选择标签</strong></div><small>{draftTags.length ? `已选 ${draftTags.length}` : "全部标签"}</small></div>{draftTags.length > 0 && <div className="selected-filter-tags">{draftTags.map((id) => { const tag = tags.find((item) => item.id === id); return tag ? <button type="button" key={id} onClick={() => setDraftTags((current) => current.filter((tagId) => tagId !== id))}>#{tag.name}<X size={12} /></button> : null; })}</div>}<input className="category-panel-search" value={tagSearch} onChange={(event) => setTagSearch(event.target.value)} placeholder="搜索标签" aria-label="搜索标签" autoFocus /><div className="category-panel-list tag-panel-list"><button type="button" className={draftTags.length === 0 ? "active" : ""} aria-pressed={draftTags.length === 0} onClick={() => setDraftTags([])}><LayoutGrid size={15} /><span>全部标签</span><small>{tags.reduce((sum, tag) => sum + tag.count, 0)}</small>{draftTags.length === 0 && <Check className="category-option-check" size={14} />}</button>{matchingTags.map((tag) => { const selected = draftTags.includes(tag.id); return <button type="button" key={tag.id} className={selected ? "active" : ""} aria-pressed={selected} onClick={() => setDraftTags((current) => selected ? current.filter((tagId) => tagId !== tag.id) : [...current, tag.id])}><span className="tag-dot" style={{ background: tag.color }} /><span>{tag.name}</span><small>{tag.count}</small>{selected && <Check className="category-option-check" size={14} />}</button>; })}</div>{!matchingTags.length && <span className="category-panel-empty">没有匹配的标签</span>}{draftTags.length > 1 && <div className="tag-match-mode" role="group" aria-label="标签匹配方式"><button type="button" className={draftTagMatchMode === "and" ? "active" : ""} aria-pressed={draftTagMatchMode === "and"} onClick={() => setDraftTagMatchMode("and")}>交集</button><button type="button" className={draftTagMatchMode === "or" ? "active" : ""} aria-pressed={draftTagMatchMode === "or"} onClick={() => setDraftTagMatchMode("or")}>并集</button></div>}<div className="category-panel-actions"><button type="button" className="secondary-button" onClick={() => setDraftTags([])} disabled={draftTags.length === 0}>清空</button><button type="button" className="primary-button" onClick={() => { onTagMatchModeChange(draftTagMatchMode); onTagSelect(draftTags); setPanel(null); }}>应用筛选</button></div></>}</div>}</div>;
}

function BookmarkEditMode({ bookmarks, onEdit, onDelete, onFavorite, onShare }: { bookmarks: BookmarkType[]; onEdit: (bookmark: BookmarkType) => void; onDelete: (bookmark: BookmarkType) => void; onFavorite: (bookmark: BookmarkType) => void; onShare: (bookmark: BookmarkType) => void }) {
  return <div className="bookmark-edit-mode" role="group" aria-label="当前页面书签编辑模式"><div className="edit-mode-hint"><Pencil size={15} /><span>编辑模式：收藏、分享、修改和删除都集中在这里处理</span></div><div className="bookmark-edit-grid">{bookmarks.map((bookmark) => <article className="bookmark-edit-item" key={bookmark.id}><div className="inline-editor-heading"><div className="favicon"><img src={bookmark.favicon} alt="" /></div><div><strong>{bookmark.title}</strong><span>{bookmark.domain}</span></div></div><div className="bookmark-edit-badges"><button className={bookmark.publicationId ? "shared-active" : "tag-action-edit"} onClick={() => onShare(bookmark)} title={bookmark.publicationId ? `取消分享${bookmark.title}` : `分享${bookmark.title}`} aria-label={bookmark.publicationId ? `取消分享${bookmark.title}` : `分享${bookmark.title}`}><Share2 size={14} /></button><button className={bookmark.isFavorite ? "favorite-active" : "tag-action-edit"} onClick={() => onFavorite(bookmark)} title={bookmark.isFavorite ? `取消收藏${bookmark.title}` : `收藏${bookmark.title}`} aria-label={bookmark.isFavorite ? `取消收藏${bookmark.title}` : `收藏${bookmark.title}`}><Star size={14} fill={bookmark.isFavorite ? "currentColor" : "none"} /></button><button className="tag-action-edit" onClick={() => onEdit(bookmark)} title={`编辑${bookmark.title}`} aria-label={`编辑${bookmark.title}`}><Pencil size={14} /></button><button className="tag-action-delete" onClick={() => onDelete(bookmark)} title={`删除${bookmark.title}`} aria-label={`删除${bookmark.title}`}><X size={14} /></button></div></article>)}</div></div>;
}

function GoogleLogo() {
  return <svg className="google-logo" viewBox="0 0 18 18" aria-hidden="true" focusable="false"><path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.797 2.716v2.259h2.909c1.702-1.567 2.684-3.874 2.684-6.615Z" /><path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.956-2.18l-2.909-2.259c-.806.54-1.835.859-3.047.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.332A9 9 0 0 0 9 18Z" /><path fill="#FBBC05" d="M3.963 10.706A5.41 5.41 0 0 1 3.681 9c0-.592.102-1.168.282-1.706V4.962H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.038l3.007-2.332Z" /><path fill="#EA4335" d="M9 3.58c1.321 0 2.507.454 3.44 1.345l2.581-2.581C13.464.892 11.426 0 9 0A9 9 0 0 0 .956 4.962l3.007 2.332C4.672 5.165 6.656 3.58 9 3.58Z" /></svg>;
}

function LoginScreen({ onLoggedIn }: { onLoggedIn: (user: UserResponse) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<"google" | "feishu" | null>(null);
  const [providers, setProviders] = useState<{
    google: boolean;
    feishu: boolean;
  } | null>(null);
  const [error, setError] = useState("");
  const [loginMethod, setLoginMethod] = useState<"social" | "password">("social");
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("error");
    if (code === "access_denied") setError("已取消第三方登录");
    else if (code) setError("第三方登录失败，请稍后重试");
    let active = true;
    void apiFetch("/api/auth/providers", { cache: "no-store" })
      .then((response) => response.json())
      .then((body: unknown) => {
        if (
          active &&
          typeof body === "object" &&
          body !== null &&
          "google" in body &&
          typeof body.google === "boolean" &&
          "feishu" in body &&
          typeof body.feishu === "boolean"
        )
          setProviders({ google: body.google, feishu: body.feishu });
      })
      .catch(() => {
        if (active) setProviders({ google: false, feishu: false });
      });
    return () => {
      active = false;
    };
  }, []);
  async function signInWith(provider: "google" | "feishu"): Promise<void> {
    if (oauthProvider) return;
    setOauthProvider(provider);
    setError("");
    const providerName = provider === "feishu" ? "飞书" : "Google";
    try {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: "/",
        errorCallbackURL: "/",
      });
      if (result.error)
        setError(
          result.error.code === "PROVIDER_NOT_FOUND"
            ? `${providerName}登录尚未配置`
            : `${providerName}登录失败，请稍后重试`,
        );
    } catch {
      setError(`${providerName}登录失败，请稍后重试`);
    } finally {
      setOauthProvider(null);
    }
  }
  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const responseResult = await fromPromise(apiFetch("/api/auth/sign-in/email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) }), () => ({ code: "NETWORK_ERROR", message: "无法连接到服务器" }));
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
  return <main className="auth-shell"><div className="auth-panel"><div className="auth-brand"><span className="brand-mark"><Bookmark size={18} strokeWidth={2.6} /></span><strong>bookmark-nav</strong></div><div><p className="eyebrow">个人工作区</p><h1>登录</h1><p>选择适合你的方式进入书签工作台。</p></div><div className="auth-tabs" role="tablist" aria-label="登录方式"><button type="button" id="social-login-tab" role="tab" aria-selected={loginMethod === "social"} aria-controls="social-login-panel" className={loginMethod === "social" ? "active" : ""} onClick={() => setLoginMethod("social")}>第三方登录</button><button type="button" id="password-login-tab" role="tab" aria-selected={loginMethod === "password"} aria-controls="password-login-panel" className={loginMethod === "password" ? "active" : ""} onClick={() => setLoginMethod("password")}>账号密码</button></div><div className="auth-tab-content">{loginMethod === "social" ? <section className="auth-method social-auth" id="social-login-panel" role="tabpanel" aria-labelledby="social-login-tab">{providers?.feishu && <button type="button" className="secondary-button auth-submit" disabled={oauthProvider !== null} onClick={() => void signInWith("feishu")}><MessageCircle size={18} />{oauthProvider === "feishu" ? "正在前往飞书..." : "使用飞书登录"}</button>}{providers?.google && <button type="button" className="secondary-button auth-submit" disabled={oauthProvider !== null} onClick={() => void signInWith("google")}><GoogleLogo />{oauthProvider === "google" ? "正在前往 Google..." : "使用 Google 登录"}</button>}{!providers && <small>正在加载登录方式...</small>}{providers && !providers.google && !providers.feishu && <small>第三方登录暂不可用。</small>}{providers && (providers.google || providers.feishu) && <small>首次使用会自动创建账号。</small>}{error && <p className="form-error" role="alert">{error}</p>}</section> : <section id="password-login-panel" role="tabpanel" aria-labelledby="password-login-tab"><form className="password-login-form" onSubmit={(event) => void submit(event)}><label>邮箱<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label><label>密码<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" minLength={8} required /></label><button type="button" className="demo-link" onClick={fillDemoCredentials}>Demo 尝试</button>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button auth-submit" disabled={submitting}>{submitting ? "登录中..." : "登录"}</button></form></section>}</div></div></main>;
}

function BookmarkCard({ bookmark, tags, sites, onFavorite, onShare, onClick }: { bookmark: BookmarkType; tags: DashboardData["tags"]; sites: Site[]; onFavorite: () => void; onShare: () => void; onClick: () => void }) { return <article className="bookmark-card" role="listitem" tabIndex={0} aria-label={`打开书签 ${bookmark.title}`} onClick={(event) => handleBookmarkSurfaceClick(event, bookmark.url, onClick)} onKeyDown={(event) => handleBookmarkSurfaceKeyDown(event, bookmark.url, onClick)}><div className="card-top"><div className="favicon"><img src={bookmark.favicon} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /></div><div className="bookmark-actions"><button type="button" className={`more-button ${bookmark.publicationId ? "shared-active" : ""}`} aria-label={bookmark.publicationId ? "取消分享" : "分享书签"} title={bookmark.publicationId ? "取消分享" : "分享书签"} onClick={onShare}><Share2 size={17} /></button><button type="button" className={`more-button ${bookmark.isFavorite ? "favorite-active" : ""}`} aria-label={bookmark.isFavorite ? "取消收藏" : "收藏书签"} title={bookmark.isFavorite ? "取消收藏" : "收藏书签"} onClick={onFavorite}><Star size={18} fill={bookmark.isFavorite ? "currentColor" : "none"} /></button></div></div><a href={bookmark.url} target="_blank" rel="noreferrer" onClick={onClick}><h3>{bookmark.title}</h3><span className="domain">{bookmark.domain}<ArrowUpRight size={12} /></span></a><p>{bookmark.description}</p><div className="card-bottom"><div className="card-tags">{effectiveTagIds(bookmark, sites).map((id) => <span key={id} style={{ "--tag-color": tagColor(id, tags) } as React.CSSProperties}>#{tags.find((tag) => tag.id === id)?.name}</span>)}</div><span className="clicks"><BarChart3 size={13} />{bookmark.clicks}</span></div></article>; }

function BookmarkCircle({ bookmark, onClick }: { bookmark: BookmarkType; onClick: () => void }) {
  return <article className="bookmark-circle-item" role="listitem"><a href={bookmark.url} target="_blank" rel="noreferrer" onClick={onClick}><span className="circle-favicon"><img src={bookmark.favicon} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /></span><strong>{bookmark.title}</strong></a></article>;
}

function BookmarkCompactRow({ bookmark, onClick }: { bookmark: BookmarkType; onClick: () => void }) {
  return <article className="bookmark-compact-row" role="listitem"><a href={bookmark.url} target="_blank" rel="noreferrer" onClick={onClick}><strong>{bookmark.title}</strong><span>{bookmark.domain}</span><span className="compact-favicon"><img src={bookmark.favicon} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /></span></a></article>;
}

function BookmarkListRow({ bookmark, tags, sites, onFavorite, onShare, onClick }: { bookmark: BookmarkType; tags: DashboardData["tags"]; sites: Site[]; onFavorite: () => void; onShare: () => void; onClick: () => void }) {
  return <article className="bookmark-list-row" role="listitem" tabIndex={0} aria-label={`打开书签 ${bookmark.title}`} onClick={(event) => handleBookmarkSurfaceClick(event, bookmark.url, onClick)} onKeyDown={(event) => handleBookmarkSurfaceKeyDown(event, bookmark.url, onClick)}><div className="favicon"><img src={bookmark.favicon} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /></div><div className="list-main"><a href={bookmark.url} target="_blank" rel="noreferrer" onClick={onClick}><strong>{bookmark.title}</strong><span className="domain">{bookmark.domain}<ArrowUpRight size={12} /></span></a><p>{bookmark.description || "暂无描述"}</p></div><div className="list-tags">{effectiveTagIds(bookmark, sites).map((id) => <span key={id} style={{ "--tag-color": tagColor(id, tags) } as React.CSSProperties}>#{tags.find((tag) => tag.id === id)?.name}</span>)}</div><span className="clicks"><BarChart3 size={13} />{bookmark.clicks}</span><div className="bookmark-actions"><button type="button" className={`more-button ${bookmark.publicationId ? "shared-active" : ""}`} aria-label={bookmark.publicationId ? "取消分享" : "分享书签"} onClick={onShare}><Share2 size={16} /></button><button type="button" className={`more-button ${bookmark.isFavorite ? "favorite-active" : ""}`} aria-label={bookmark.isFavorite ? "取消收藏" : "收藏书签"} onClick={onFavorite}><Star size={17} fill={bookmark.isFavorite ? "currentColor" : "none"} /></button></div></article>;
}

function BookmarkTable({ bookmarks, folders, tags, sites, onFavorite, onShare, onClick }: { bookmarks: BookmarkType[]; folders: DashboardData["folders"]; tags: DashboardData["tags"]; sites: Site[]; onFavorite: (bookmark: BookmarkType) => void; onShare: (bookmark: BookmarkType) => void; onClick: (bookmark: BookmarkType) => void }) {
  return <div className="bookmark-table-wrap"><table className="bookmark-table bookmark-browse-table"><thead><tr><th>书签</th><th>目录</th><th>标签</th><th>访问</th><th>添加时间</th><th aria-label="操作" /></tr></thead><tbody>{bookmarks.map((bookmark) => <tr key={bookmark.id} tabIndex={0} aria-label={`打开书签 ${bookmark.title}`} onClick={(event) => handleBookmarkSurfaceClick(event, bookmark.url, () => onClick(bookmark))} onKeyDown={(event) => handleBookmarkSurfaceKeyDown(event, bookmark.url, () => onClick(bookmark))}><td><div className="table-title"><div className="favicon"><img src={bookmark.favicon} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /></div><a href={bookmark.url} target="_blank" rel="noreferrer" onClick={() => onClick(bookmark)}><strong>{bookmark.title}</strong><span>{bookmark.domain}</span></a></div></td><td>{folders.find((folder) => folder.id === bookmark.folderId)?.name || "未分类"}</td><td><div className="list-tags">{effectiveTagIds(bookmark, sites).map((id) => <span key={id} style={{ "--tag-color": tagColor(id, tags) } as React.CSSProperties}>#{tags.find((tag) => tag.id === id)?.name}</span>)}</div></td><td><span className="clicks"><BarChart3 size={13} />{bookmark.clicks}</span></td><td>{new Date(bookmark.createdAt).toLocaleDateString("zh-CN")}</td><td><div className="bookmark-actions"><button type="button" className={`more-button ${bookmark.publicationId ? "shared-active" : ""}`} aria-label={bookmark.publicationId ? "取消分享" : "分享书签"} onClick={() => onShare(bookmark)}><Share2 size={15} /></button><button type="button" className={`more-button ${bookmark.isFavorite ? "favorite-active" : ""}`} aria-label={bookmark.isFavorite ? "取消收藏" : "收藏书签"} onClick={() => onFavorite(bookmark)}><Star size={16} fill={bookmark.isFavorite ? "currentColor" : "none"} /></button></div></td></tr>)}</tbody></table></div>;
}
