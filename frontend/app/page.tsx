"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as LucideIcons from "lucide-react";
import { Activity, Archive, ArrowUpRight, BarChart3, Bell, Bookmark, BookOpen, Briefcase, CalendarDays, Camera, Check, ChevronLeft, ChevronRight, CircleDot, Clock3, Cloud, Code2, Compass, Copy, Database, Download, FileText, Film, Flag, Folder, FolderOpen, Gamepad2, Globe2, GraduationCap, Hammer, Headphones, Heart, Image, Inbox, KeyRound, Lightbulb, Link, Link2, Lock, LayoutGrid, LifeBuoy, List, LogOut, Map, Menu, MessageCircle, Monitor, Moon, Music, Package, Palette, PanelLeftClose, PanelLeftOpen, Pencil, Plane, Plus, Rocket, Rows3, Rss, Search, Settings2, Share2, Shield, ShoppingBag, SlidersHorizontal, Sparkles, Star, Sun, Tag, Terminal, Table2, ThumbsUp, Trash2, Trophy, Tv, Users, Wallet, Wifi, Wrench, X, type LucideIcon } from "lucide-react";
import type { Bookmark as BookmarkType, DashboardData } from "../lib/types";
import { apiKeyCreatedResponse, apiKeyListResponse, bookmarkPageResponse, bookmarkResponse, dashboardResponse, folderResponse, fromPromise, publicationListResponse, sessionResponse, sharedCollectionListResponse, sharedCollectionResponse, siteResponse, tagResponse, type ApiKeyResponse, type BookmarkPageResponse, type Folder as FolderType, type IconLibrary, type JsonValue, type Publication, type SharedCollection, type Site, type Tag as TagType, type UserResponse } from "@loomark/shared";
import { useTheme, type ThemeMode } from "./theme-provider";
import { useWorkspaceMode } from "./workspace-mode";

const initial: DashboardData = { bookmarks: [], folders: [], tags: [], sites: [], totalClicks: 0 };
const tagColor = (id: string, tags: DashboardData["tags"]) => tags.find((tag) => tag.id === id)?.color || "#94a3b8";
const effectiveTagIds = (bookmark: BookmarkType, sites: Site[]) => Array.from(new Set([...(sites.find((site) => site.id === bookmark.siteId)?.tags || []), ...bookmark.tags]));
const iconLibrary: Record<string, LucideIcon> = { Activity, Archive, Bell, BookOpen, Briefcase, CalendarDays, Camera, Cloud, Code2, Database, FileText, Film, Flag, Folder, FolderOpen, Gamepad2, Globe2, GraduationCap, Hammer, Headphones, Heart, Image, Inbox, LayoutGrid, Lightbulb, LifeBuoy, Link, Lock, Map, MessageCircle, Monitor, Music, Package, Palette, Plane, Rocket, Rss, Shield, ShoppingBag, Sparkles, Star, Tag, Terminal, ThumbsUp, Trophy, Tv, Users, Wallet, Wifi, Wrench };
const iconChoices = Object.keys(iconLibrary);
const iconGroups = [
  { id: "general", label: "通用", icons: ["Folder", "FolderOpen", "Bookmark", "Star", "Heart", "Flag", "Tag", "Archive", "Inbox"] },
  { id: "work", label: "工作", icons: ["Briefcase", "CalendarDays", "Clock3", "Users", "MessageCircle", "Bell", "FileText", "Database", "Settings2"] },
  { id: "development", label: "开发", icons: ["Code2", "Terminal", "Wrench", "Hammer", "GitBranch", "Package", "Monitor", "Wifi", "Cloud"] },
  { id: "media", label: "内容", icons: ["BookOpen", "Image", "Film", "Music", "Headphones", "Tv", "Palette", "Camera", "Rss"] },
].map((group) => ({ ...group, icons: group.icons.filter((name) => iconChoices.includes(name)) }));
const emojiGroups = [
  { id: "general", label: "常用", icons: ["⭐", "❤️", "🔥", "✨", "✅", "📌", "🔖", "💡", "🎯"] },
  { id: "work", label: "工作", icons: ["💼", "📅", "📊", "📈", "📝", "📁", "📚", "🤝", "⏰"] },
  { id: "development", label: "开发", icons: ["💻", "🧑‍💻", "⚙️", "🛠️", "🔧", "🧪", "🚀", "🌐", "🔐"] },
  { id: "media", label: "内容", icons: ["🎨", "🖼️", "🎬", "🎵", "🎧", "🎮", "📖", "📰", "📷"] },
];
function LibraryIcon({ library = "lucide", name, size = 16 }: { library?: IconLibrary; name?: string; size?: number }) {
  const Icon = library === "lucide" && name ? iconLibrary[name] || (LucideIcons as unknown as Record<string, LucideIcon>)[name] : undefined;
  return Icon ? <Icon size={size} strokeWidth={1.9} aria-hidden="true" /> : <span className="legacy-icon" aria-hidden="true">{name || "Folder"}</span>;
}

function IconNamePicker({ library, value, onChange, label }: { library: IconLibrary; value: string; onChange: (value: string) => void; label: string }) {
  const [activeGroup, setActiveGroup] = useState("general");
  const groups = library === "emoji" ? emojiGroups : iconGroups;
  const group = groups.find((item) => item.id === activeGroup) || groups[0];
  if (library === "custom") return null;
  return <div className="icon-picker" aria-label={label}><span className="field-label">{library === "emoji" ? "Emoji 图标" : "Lucide 图标"}</span><div className="icon-picker-tabs" role="tablist" aria-label={`${label}分类`}>{groups.map((item) => <button type="button" role="tab" aria-selected={group.id === item.id} className={group.id === item.id ? "active" : ""} key={item.id} onClick={() => setActiveGroup(item.id)}>{item.label}</button>)}</div><div className="icon-picker-options">{group.icons.map((choice) => <button type="button" key={choice} className={value === choice ? "picked" : ""} onClick={() => onChange(choice)} aria-label={`选择${choice}图标`} title={choice}><LibraryIcon library={library} name={choice} size={17} /></button>)}</div></div>;
}

function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return globalThis.fetch(input, { ...init, credentials: "include" });
}

type ManagementSection = "bookmarks" | "folders" | "tags" | "sites" | "sharing";
type QuerySource = "table" | "view";
type QueryLogic = "and" | "or";
type QueryOperator = "contains" | "equals" | "notEquals" | "gt" | "lt" | "isEmpty" | "isNotEmpty";
type QueryValue = string | number | boolean | string[] | null | undefined;
type QueryField<T> = { id: string; label: string; source: QuerySource; operators: QueryOperator[]; getValue: (item: T) => QueryValue; options?: { label: string; value: string }[]; placeholder?: string };
type QueryCondition = { id: string; fieldId: string; operator: QueryOperator; value: string };
type QueryState = { source: QuerySource; logic: QueryLogic; conditions: QueryCondition[]; page: number; pageSize: number };

const operatorLabels: Record<QueryOperator, string> = { contains: "包含", equals: "等于", notEquals: "不等于", gt: "大于", lt: "小于", isEmpty: "为空", isNotEmpty: "不为空" };
const operatorNeedsValue = (operator: QueryOperator): boolean => operator !== "isEmpty" && operator !== "isNotEmpty";
const makeCondition = (fieldId: string, operator: QueryOperator = "contains"): QueryCondition => ({ id: `condition-${Date.now()}-${Math.random().toString(16).slice(2)}`, fieldId, operator, value: "" });
const makeQueryState = (fieldId: string): QueryState => ({ source: "view", logic: "and", conditions: [{ id: `initial-${fieldId}`, fieldId, operator: "contains", value: "" }], page: 1, pageSize: 10 });

function valueParts(value: QueryValue): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value === null || value === undefined) return [];
  if (typeof value === "boolean") return [value ? "true" : "false"];
  return [String(value)];
}

function matchesCondition<T>(item: T, fields: QueryField<T>[], condition: QueryCondition): boolean {
  const field = fields.find((candidate) => candidate.id === condition.fieldId);
  if (!field) return true;
  const parts = valueParts(field.getValue(item));
  const textValue = parts.join(" ").toLowerCase();
  const target = condition.value.trim().toLowerCase();
  if (condition.operator === "isEmpty") return parts.length === 0 || textValue.length === 0;
  if (condition.operator === "isNotEmpty") return parts.length > 0 && textValue.length > 0;
  if (!target) return true;
  if (condition.operator === "contains") return textValue.includes(target);
  if (condition.operator === "equals") return parts.some((part) => part.toLowerCase() === target);
  if (condition.operator === "notEquals") return parts.every((part) => part.toLowerCase() !== target);
  const numericValue = Number(parts[0]);
  const numericTarget = Number(condition.value);
  if (Number.isNaN(numericValue) || Number.isNaN(numericTarget)) return false;
  return condition.operator === "gt" ? numericValue > numericTarget : numericValue < numericTarget;
}

function filterByQuery<T>(items: T[], fields: QueryField<T>[], state: QueryState, quickSearch = ""): T[] {
  const sourceFields = fields.filter((field) => field.source === state.source);
  const activeConditions = state.conditions.filter((condition) => {
    const field = sourceFields.find((candidate) => candidate.id === condition.fieldId);
    return field && (!operatorNeedsValue(condition.operator) || condition.value.trim());
  });
  const quick = quickSearch.trim().toLowerCase();
  return items.filter((item) => {
    const quickMatched = !quick || sourceFields.some((field) => valueParts(field.getValue(item)).join(" ").toLowerCase().includes(quick));
    if (!quickMatched) return false;
    if (!activeConditions.length) return true;
    const results = activeConditions.map((condition) => matchesCondition(item, sourceFields, condition));
    return state.logic === "and" ? results.every(Boolean) : results.some(Boolean);
  });
}

function pageSlice<T>(items: T[], state: QueryState): { items: T[]; page: number; pageSize: number; total: number; totalPages: number } {
  const totalPages = items.length === 0 ? 0 : Math.ceil(items.length / state.pageSize);
  const page = totalPages === 0 ? 1 : Math.min(state.page, totalPages);
  return { items: items.slice((page - 1) * state.pageSize, page * state.pageSize), page, pageSize: state.pageSize, total: items.length, totalPages };
}

export default function Home() {
  const { mode, setMode } = useTheme();
  const workspaceMode = useWorkspaceMode();
  const isEditor = workspaceMode === "edit";
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
  const [editingBookmark, setEditingBookmark] = useState<BookmarkType | null>(null);
  const [showMenu, setShowMenu] = useState(false);
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
  const [displayMode, setDisplayMode] = useState<"grid" | "circle" | "compact" | "list" | "table">(() => {
    if (typeof window === "undefined") return "grid";
    const saved = window.localStorage.getItem("bookmark-nav-display-mode");
    return saved === "circle" || saved === "compact" || saved === "list" || saved === "table" ? saved : "grid";
  });
  const [pageInfo, setPageInfo] = useState<BookmarkPageResponse>({ items: [], page: 1, pageSize: 9, total: 0, totalPages: 0 });
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
    const requestId = ++pageRequestId.current;
    setPageLoading(true);
    setPageError(null);
    const params = new URLSearchParams({ page: String(page), pageSize: "9", sort: activeView === "recent" ? "recent" : sort });
    if (activeView === "favorites") params.set("favorite", "true");
    if (activeFolder !== "all") params.set("folderId", activeFolder);
    if (activeTag) params.set("tagId", activeTag);
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
    if (!user) return;
    if (activeView === "discover") void loadDiscover();
    else if (activeView !== "sites") void loadPage(1);
  }, [activeFolder, activeTag, activeView, query, sort, user]);
  useEffect(() => {
    if (!user || !isEditor || managementSection !== "sharing") return;
    void loadDiscover();
  }, [isEditor, managementSection, user]);

  const visible = pageInfo.items;
  const folderName = activeView === "recent" ? "最近添加" : activeView === "favorites" ? "我的收藏" : activeView === "sites" ? "网站" : activeView === "discover" ? "发现" : data.folders.find((folder) => folder.id === activeFolder)?.name || "全部书签";
  const isBookmarkEditor = isEditor && activeView !== "sites" && activeView !== "discover";
  useEffect(() => { window.localStorage.setItem("bookmark-nav-display-mode", displayMode); }, [displayMode]);

  function switchWorkspaceView(view: typeof activeView, folder = "all", tag: string | null = null): void {
    setActiveView(view);
    setActiveFolder(folder);
    setActiveTag(tag);
    setQuery("");
    setPageInfo((current) => ({ ...current, page: 1 }));
    if (view === "recent") setSort("recent");
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

  if (isEditor) return <>
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
          <ThemeSwitcher mode={mode} setMode={setMode} />
          <a className="secondary-button management-back" href="/"><ChevronLeft size={15} />返回主页</a>
        </div>
      </aside>
      <main className="management-main">
        <header className="management-topbar">
          <div><p className="eyebrow">管理后台</p><h1>管理配置</h1></div>
          <div className="top-actions"><div className="top-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索书签..." /></div><button type="button" className="primary-button" onClick={() => openAddBookmark()}><Plus size={16} />添加书签</button><div className="menu-wrap"><button type="button" className="avatar mini" onClick={() => setShowMenu(!showMenu)} aria-label="打开账号菜单">{user.name.slice(0, 1).toUpperCase()}</button>{showMenu && <div className="user-menu"><strong>{user.name}</strong><span>{user.email}</span><hr /><button type="button" onClick={() => { setShowAccount(true); setShowMenu(false); }}><Settings2 size={15} />账号设置</button><button type="button" onClick={() => void logout()}><LogOut size={15} />退出登录</button></div>}</div></div>
        </header>
        <section className="management-content">
          <div className="management-summary" aria-label="管理概览">
            <div><span>书签</span><strong>{data.bookmarks.length}</strong></div>
            <div><span>目录</span><strong>{data.folders.filter((folder) => folder.id !== "all").length}</strong></div>
            <div><span>标签</span><strong>{data.tags.length}</strong></div>
            <div><span>网站</span><strong>{data.sites.length}</strong></div>
          </div>
          {managementSection === "bookmarks" && <BookmarkManagementPanel bookmarks={data.bookmarks} folders={data.folders.filter((folder) => folder.id !== "all")} tags={data.tags} sites={data.sites} query={managementQueries.bookmarks} quickSearch={query} sort={sort} loading={loading} error={null} onQueryChange={(patch) => updateManagementQuery("bookmarks", patch)} onSortChange={setSort} onAdd={() => openAddBookmark()} onEdit={setEditingBookmark} onFavorite={(bookmark) => void toggleFavorite(bookmark)} onShare={(bookmark) => void toggleShare(bookmark)} onDelete={(bookmark) => void deleteBookmark(bookmark)} />}
          {managementSection === "folders" && <FolderManagementPanel folders={data.folders.filter((folder) => folder.id !== "all")} query={managementQueries.folders} quickSearch={query} onQueryChange={(patch) => updateManagementQuery("folders", patch)} onCreate={() => setFolderEditor("new")} onEdit={setFolderEditor} />}
          {managementSection === "tags" && <TagManagementWorkspace tags={data.tags} query={managementQueries.tags} quickSearch={query} onQueryChange={(patch) => updateManagementQuery("tags", patch)} onCreate={() => setTagEditor("new")} onEdit={setTagEditor} onPublish={setPublishingTag} onDelete={(tag) => void deleteTag(tag)} />}
          {managementSection === "sites" && <SiteManagementPanel sites={data.sites} bookmarks={data.bookmarks} folders={data.folders.filter((folder) => folder.id !== "all")} tags={data.tags} query={managementQueries.sites} quickSearch={query} onQueryChange={(patch) => updateManagementQuery("sites", patch)} onCreate={() => setSiteEditor("new")} onEdit={setSiteEditor} onAddLink={(siteId) => openAddBookmark(siteId)} />}
          {managementSection === "sharing" && <SharingManagementPanel discoverMode={discoverMode} setDiscoverMode={setDiscoverMode} publications={publications} sharedCollections={sharedCollections} savedPublicationIds={savedPublicationIds} savedCollectionIds={savedCollectionIds} query={managementQueries.sharing} quickSearch={query} loading={pageLoading} error={pageError} onQueryChange={(patch) => updateManagementQuery("sharing", patch)} onReload={() => void loadDiscover()} onSavePublication={(publication) => void saveSharedBookmark(publication)} onSaveCollection={(collection) => void saveCollection(collection)} />}
        </section>
      </main>
    </div>
    {showAdd && <AddBookmarkModal folders={data.folders.filter((folder) => folder.id !== "all")} tags={data.tags} sites={data.sites} initialSiteId={addSiteId} onClose={() => { setShowAdd(false); setAddSiteId(null); }} onAdded={handleAdd} />}
    {editingBookmark && <EditBookmarkModal bookmarks={[editingBookmark]} folders={data.folders.filter((folder) => folder.id !== "all")} tags={data.tags} sites={data.sites} onClose={() => setEditingBookmark(null)} onSaved={(updated) => { setEditingBookmark(null); setPageInfo((current) => ({ ...current, items: current.items.map((item) => item.id === updated.id ? updated : item) })); setData((current) => ({ ...current, bookmarks: current.bookmarks.map((item) => item.id === updated.id ? updated : item) })); void refreshDashboard(); }} />}
    {showAccount && <AccountModal user={user} onClose={() => setShowAccount(false)} onSaved={(updated) => { setUser(updated); setShowAccount(false); }} />}
    {folderEditor && <FolderModal folder={folderEditor === "new" ? null : folderEditor} onClose={() => setFolderEditor(null)} onSaved={() => { setFolderEditor(null); void refreshDashboard(); }} />}
    {tagEditor && <TagModal tag={tagEditor === "new" ? null : tagEditor} tags={data.tags} onClose={() => setTagEditor(null)} onSaved={() => { setTagEditor(null); void refreshDashboard(); }} />}
    {siteEditor && <SiteModal site={siteEditor === "new" ? null : siteEditor} folders={data.folders.filter((folder) => folder.id !== "all")} tags={data.tags} onClose={() => setSiteEditor(null)} onSaved={() => { setSiteEditor(null); void refreshDashboard(); }} />}
    {publishingTag && <PublishCollectionModal tag={publishingTag} bookmarks={data.bookmarks} sites={data.sites} onClose={() => setPublishingTag(null)} onSaved={() => { setPublishingTag(null); void refreshDashboard(); }} />}
  </>;

  return <div className="shell">
    <aside className={`sidebar ${mobileNav ? "mobile-open" : ""} ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <div className="brand"><span className="brand-mark"><Bookmark size={17} strokeWidth={2.6} /></span><span>bookmark-nav</span><button type="button" className="icon-button sidebar-toggle" onClick={() => setSidebarCollapsed((current) => !current)} aria-label={sidebarCollapsed ? "展开导航" : "收起导航"} title={sidebarCollapsed ? "展开导航" : "收起导航"}>{sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button><button type="button" className="icon-button sidebar-close" onClick={() => setMobileNav(false)} aria-label="关闭导航"><X size={18} /></button></div>
      <nav className="nav">
        <p className="nav-label">个人空间</p>
        <button type="button" className={`nav-item ${activeView === "all" && activeFolder === "all" && !activeTag ? "selected" : ""}`} onClick={() => switchWorkspaceView("all")}><LayoutGrid size={17} />我的书签<span className="nav-count">{data.bookmarks.length}</span></button>
        <button type="button" className={`nav-item ${activeView === "recent" ? "selected" : ""}`} onClick={() => switchWorkspaceView("recent")}><Clock3 size={17} />最近添加</button>
        <button type="button" className={`nav-item ${activeView === "favorites" ? "selected" : ""}`} onClick={() => switchWorkspaceView("favorites")}><Star size={17} />我的收藏<span className="nav-count">{data.bookmarks.filter((bookmark) => bookmark.isFavorite).length}</span></button>
        <button type="button" className={`nav-item ${activeView === "sites" ? "selected" : ""}`} onClick={() => switchWorkspaceView("sites")}><Globe2 size={17} />网站<span className="nav-count">{data.sites.length}</span></button>
        <p className="nav-label folder-label">共享空间</p>
        <button type="button" className={`nav-item ${activeView === "discover" ? "selected" : ""}`} onClick={() => switchWorkspaceView("discover")}><Compass size={17} />发现</button>
        <p className="nav-label folder-label">目录 {isEditor && <button type="button" className="tiny-add" onClick={() => setFolderEditor("new")} title="创建目录" aria-label="创建目录"><Plus size={14} /></button>}</p>
        {data.folders.filter((folder) => folder.id !== "all").map((folder) => <div className="nav-manage-row" key={folder.id}><button type="button" className={`nav-item ${activeView === "all" && activeFolder === folder.id ? "selected" : ""}`} onClick={() => switchWorkspaceView("all", folder.id)}><span className="folder-icon"><LibraryIcon library={folder.iconLibrary} name={folder.iconName} /></span>{folder.name}<span className="nav-count">{folder.count}</span></button>{isEditor && <button type="button" className="nav-edit" onClick={() => setFolderEditor(folder)} title={`编辑${folder.name}`} aria-label={`编辑${folder.name}`}><Pencil size={13} /></button>}</div>)}
      </nav>
      <TagManagementPanel tags={data.tags} activeTag={activeTag} onSelect={(tag) => switchWorkspaceView("all", "all", activeTag === tag.id ? null : tag.id)} />
      <div className="sidebar-bottom"><ThemeSwitcher mode={mode} setMode={setMode} /></div>
    </aside>
    {mobileNav && <button type="button" className="backdrop" onClick={() => setMobileNav(false)} aria-label="关闭导航" />}
    <main className="main">
      <header className="topbar"><button type="button" className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="打开导航"><Menu size={20} /></button><div className="breadcrumbs"><span>{isEditor ? "编辑" : "工作台"}</span><span>/</span><strong>{folderName}</strong>{activeTag && <><span>/</span><strong className="crumb-tag">#{data.tags.find((tag) => tag.id === activeTag)?.name}</strong></>}</div><div className="top-actions"><div className="top-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索书签..." /><kbd>⌘ K</kbd></div>{isEditor ? <a className="icon-button" href="/" title="返回主页" aria-label="返回主页"><LayoutGrid size={18} /></a> : <a className="icon-button" href="/edit" title="进入编辑页" aria-label="进入编辑页"><Pencil size={18} /></a>}<div className="menu-wrap"><button type="button" className="avatar mini" onClick={() => setShowMenu(!showMenu)} aria-label="打开账号菜单">{user.name.slice(0, 1).toUpperCase()}</button>{showMenu && <div className="user-menu"><strong>{user.name}</strong><span>{user.email}</span><hr /><button type="button" onClick={() => { setShowAccount(true); setShowMenu(false); }}><Settings2 size={15} />账号设置</button><button type="button" onClick={() => void logout()}><LogOut size={15} />退出登录</button></div>}</div></div></header>
      <section className="content">
        {activeView === "discover" ? <>
          <div className="section-heading"><div><h2>{discoverMode === "collections" ? "共享合集" : "单条分享"}</h2><span>{discoverMode === "collections" ? sharedCollections.length : publications.length} 个公开内容</span></div><div className="discovery-tabs" role="tablist" aria-label="发现内容类型"><button role="tab" aria-selected={discoverMode === "collections"} className={discoverMode === "collections" ? "active" : ""} onClick={() => setDiscoverMode("collections")}>共享合集</button><button role="tab" aria-selected={discoverMode === "links"} className={discoverMode === "links" ? "active" : ""} onClick={() => setDiscoverMode("links")}>单条分享</button></div></div>
          {pageLoading ? <LoadingState /> : pageError ? <div className="empty"><Archive size={30} /><strong>分享加载失败</strong><span>{pageError}</span><button className="secondary-button" onClick={() => void loadDiscover()}>重新加载</button></div> : discoverMode === "collections" ? sharedCollections.length ? <SharedCollectionGrid collections={sharedCollections} savedIds={savedCollectionIds} canSave={isEditor} onSave={(collection) => void saveCollection(collection)} /> : <div className="empty"><Compass size={30} /><strong>暂时没有共享合集</strong><span>用户将个人标签发布为合集后会展示在这里。</span></div> : publications.length ? <DiscoveryGrid publications={publications} savedIds={savedPublicationIds} canSave={isEditor} onSave={(publication) => void saveSharedBookmark(publication)} /> : <div className="empty"><Compass size={30} /><strong>暂时没有单条分享</strong><span>个人书签不会出现在这里，只有主动分享的内容才会展示。</span></div>}
        </> : activeView === "sites" ? <>
          <div className="section-heading"><div><h2>网站</h2><span>{data.sites.length} 个网站</span></div>{isEditor && <button className="secondary-button" onClick={() => setSiteEditor("new")}><Plus size={15} />新建网站</button>}</div>
          <SiteGroups sites={data.sites} bookmarks={data.bookmarks} tags={data.tags} editable={isEditor} onAddLink={(siteId) => openAddBookmark(siteId)} onEdit={setSiteEditor} />
        </> : <>
          <div className="section-heading"><div><h2>{activeTag ? `#${data.tags.find((tag) => tag.id === activeTag)?.name}` : folderName}</h2><span>{pageInfo.total} 个书签</span></div><div className="view-actions"><div className="sort-wrap"><SlidersHorizontal size={15} /><select value={activeView === "recent" ? "recent" : sort} disabled={activeView === "recent"} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="recent">最近添加</option><option value="clicks">访问最多</option><option value="az">名称排序</option></select></div>{!isEditor && <div className="display-toggle" aria-label="展示方式"><button type="button" className={displayMode === "grid" ? "active" : ""} onClick={() => setDisplayMode("grid")} title="大图展示" aria-label="大图展示"><LayoutGrid size={16} /></button><button type="button" className={displayMode === "circle" ? "active" : ""} onClick={() => setDisplayMode("circle")} title="圆圈展示" aria-label="圆圈展示"><CircleDot size={16} /></button><button type="button" className={displayMode === "compact" ? "active" : ""} onClick={() => setDisplayMode("compact")} title="细列表展示" aria-label="细列表展示"><Rows3 size={16} /></button><button type="button" className={displayMode === "list" ? "active" : ""} onClick={() => setDisplayMode("list")} title="列表展示" aria-label="列表展示"><List size={16} /></button><button type="button" className={displayMode === "table" ? "active" : ""} onClick={() => setDisplayMode("table")} title="表格展示" aria-label="表格展示"><Table2 size={16} /></button></div>}{isEditor && <button type="button" className="icon-button" onClick={() => openAddBookmark()} title="添加书签" aria-label="添加书签"><Plus size={18} /></button>}</div></div>
          {isBookmarkEditor ? pageLoading ? <LoadingState /> : pageError ? <div className="empty"><Archive size={30} /><strong>书签加载失败</strong><span>{pageError}</span><button className="secondary-button" onClick={() => void loadPage(pageInfo.page)}>重新加载</button></div> : visible.length ? <BookmarkEditMode bookmarks={visible} onEdit={setEditingBookmark} onDelete={(bookmark) => void deleteBookmark(bookmark)} onFavorite={(bookmark) => void toggleFavorite(bookmark)} onShare={(bookmark) => void toggleShare(bookmark)} /> : <div className="empty"><Archive size={30} /><strong>{activeView === "favorites" ? "还没有收藏的书签" : "还没有匹配的书签"}</strong><span>{activeView === "favorites" ? "先回到全部书签收藏内容" : "试试其他关键词或添加一个新书签"}</span><button className="primary-button" onClick={() => openAddBookmark()}><Plus size={16} />添加书签</button></div> : loading || pageLoading ? <LoadingState /> : pageError ? <div className="empty"><Archive size={30} /><strong>书签加载失败</strong><span>{pageError}</span><button className="secondary-button" onClick={() => void loadPage(pageInfo.page)}>重新加载</button></div> : visible.length ? <>
            {displayMode === "grid" && <div className="bookmark-grid" role="list" aria-label="大图书签">{visible.map((bookmark) => <BookmarkCard key={bookmark.id} bookmark={bookmark} tags={data.tags} sites={data.sites} onFavorite={() => void toggleFavorite(bookmark)} onShare={() => void toggleShare(bookmark)} onClick={() => clickBookmark(bookmark)} />)}</div>}
            {displayMode === "circle" && <div className="bookmark-circle-grid" role="list" aria-label="圆圈书签">{visible.map((bookmark) => <BookmarkCircle key={bookmark.id} bookmark={bookmark} onClick={() => clickBookmark(bookmark)} />)}</div>}
            {displayMode === "compact" && <div className="bookmark-compact-list" role="list" aria-label="细列表书签">{visible.map((bookmark) => <BookmarkCompactRow key={bookmark.id} bookmark={bookmark} onClick={() => clickBookmark(bookmark)} />)}</div>}
            {displayMode === "list" && <div className="bookmark-list" role="list" aria-label="列表书签">{visible.map((bookmark) => <BookmarkListRow key={bookmark.id} bookmark={bookmark} tags={data.tags} sites={data.sites} onFavorite={() => void toggleFavorite(bookmark)} onShare={() => void toggleShare(bookmark)} onClick={() => clickBookmark(bookmark)} />)}</div>}
            {displayMode === "table" && <BookmarkTable bookmarks={visible} folders={data.folders} tags={data.tags} sites={data.sites} onFavorite={toggleFavorite} onShare={toggleShare} onClick={clickBookmark} />}
            {pageInfo.totalPages > 0 && <div className="pagination"><span>第 {pageInfo.page} / {pageInfo.totalPages} 页，共 {pageInfo.total} 个</span><div><button className="icon-button" disabled={pageLoading || pageInfo.page <= 1} onClick={() => void loadPage(pageInfo.page - 1)} title="上一页" aria-label="上一页"><ChevronLeft size={17} /></button><button className="icon-button" disabled={pageLoading || pageInfo.page >= pageInfo.totalPages} onClick={() => void loadPage(pageInfo.page + 1)} title="下一页" aria-label="下一页"><ChevronRight size={17} /></button></div></div>}
          </> : <div className="empty"><Archive size={30} /><strong>{activeView === "favorites" ? "还没有收藏的书签" : "还没有匹配的书签"}</strong><span>{activeView === "favorites" ? "收藏操作请进入编辑页完成" : "试试其他关键词，或进入编辑页添加新书签"}</span><a className="primary-button" href="/edit"><Pencil size={16} />进入编辑页</a></div>}
        </>}
        <footer><span>已同步 · 刚刚</span><span><Link2 size={13} /> API 已就绪</span></footer>
      </section>
    </main>
    {isEditor && showAdd && <AddBookmarkModal folders={data.folders.filter((folder) => folder.id !== "all")} tags={data.tags} sites={data.sites} initialSiteId={addSiteId} onClose={() => { setShowAdd(false); setAddSiteId(null); }} onAdded={handleAdd} />}
    {isEditor && editingBookmark && <EditBookmarkModal bookmarks={[editingBookmark]} folders={data.folders.filter((folder) => folder.id !== "all")} tags={data.tags} sites={data.sites} onClose={() => setEditingBookmark(null)} onSaved={(updated) => { setEditingBookmark(null); setPageInfo((current) => ({ ...current, items: current.items.map((item) => item.id === updated.id ? updated : item) })); setData((current) => ({ ...current, bookmarks: current.bookmarks.map((item) => item.id === updated.id ? updated : item) })); void refreshDashboard(); }} />}
    {showAccount && <AccountModal user={user} onClose={() => setShowAccount(false)} onSaved={(updated) => { setUser(updated); setShowAccount(false); }} />}
    {isEditor && folderEditor && <FolderModal folder={folderEditor === "new" ? null : folderEditor} onClose={() => setFolderEditor(null)} onSaved={() => { setFolderEditor(null); void refreshDashboard(); }} />}
    {isEditor && tagEditor && <TagModal tag={tagEditor === "new" ? null : tagEditor} tags={data.tags} onClose={() => setTagEditor(null)} onSaved={() => { setTagEditor(null); void refreshDashboard(); }} />}
    {isEditor && siteEditor && <SiteModal site={siteEditor === "new" ? null : siteEditor} folders={data.folders.filter((folder) => folder.id !== "all")} tags={data.tags} onClose={() => setSiteEditor(null)} onSaved={() => { setSiteEditor(null); void refreshDashboard(); }} />}
    {isEditor && publishingTag && <PublishCollectionModal tag={publishingTag} bookmarks={data.bookmarks} sites={data.sites} onClose={() => setPublishingTag(null)} onSaved={() => { setPublishingTag(null); void refreshDashboard(); }} />}
  </div>;
}

function LoadingState() {
  return <div className="loading-state" aria-label="正在加载书签" aria-busy="true"><div className="loading-toolbar"><span className="skeleton-line medium" /><span className="skeleton-line short" /></div><div className="loading-grid">{["one", "two", "three", "four", "five", "six"].map((key) => <div className="bookmark-card skeleton-bookmark" key={key}><span className="skeleton-block skeleton-favicon" /><span className="skeleton-line medium" /><span className="skeleton-line long" /><span className="skeleton-line paragraph" /><div className="skeleton-footer"><span className="skeleton-line tag" /><span className="skeleton-line tiny" /></div></div>)}</div></div>;
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

function BookmarkManagementPanel({ bookmarks, folders, tags, sites, query, quickSearch, sort, loading, error, onQueryChange, onSortChange, onAdd, onEdit, onFavorite, onShare, onDelete }: { bookmarks: BookmarkType[]; folders: DashboardData["folders"]; tags: DashboardData["tags"]; sites: Site[]; query: QueryState; quickSearch: string; sort: "recent" | "clicks" | "az"; loading: boolean; error: string | null; onQueryChange: (patch: Partial<QueryState>) => void; onSortChange: (sort: "recent" | "clicks" | "az") => void; onAdd: () => void; onEdit: (bookmark: BookmarkType) => void; onFavorite: (bookmark: BookmarkType) => void; onShare: (bookmark: BookmarkType) => void; onDelete: (bookmark: BookmarkType) => void }) {
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

function TagManagementWorkspace({ tags, query, quickSearch, onQueryChange, onCreate, onEdit, onPublish, onDelete }: { tags: TagType[]; query: QueryState; quickSearch: string; onQueryChange: (patch: Partial<QueryState>) => void; onCreate: () => void; onEdit: (tag: TagType) => void; onPublish: (tag: TagType) => void; onDelete: (tag: TagType) => void }) {
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
  return <section className="management-panel"><div className="management-panel-header"><div><h2>标签管理</h2><span>{pageInfo.total} 个标签</span></div><button className="primary-button" onClick={onCreate}><Plus size={15} />新建标签</button></div><ManagementQueryBuilder fields={fields} state={query} onChange={onQueryChange} total={pageInfo.total} page={pageInfo.page} totalPages={pageInfo.totalPages} /><div className="management-list tag-management-list">{pageInfo.items.length ? pageInfo.items.map((tag) => <article className={`management-row-card ${tag.parentId ? "child" : ""}`} key={tag.id}><div><span className="tag-dot" style={{ background: tag.color }} /><strong>{tag.name}</strong><small>{tag.count} 个书签{tag.collectionId ? " · 已发布" : ""}</small></div><div className="management-row-actions"><button className={tag.collectionId ? "secondary-button shared-active" : "secondary-button"} aria-label={tag.collectionId ? `同步合集${tag.name}` : `发布标签${tag.name}`} onClick={() => onPublish(tag)}><Share2 size={14} />{tag.collectionId ? "同步" : "发布"}</button><button className="secondary-button" aria-label={`编辑${tag.name}`} onClick={() => onEdit(tag)}><Pencil size={14} />编辑</button><button className="secondary-button danger-button" aria-label={`删除${tag.name}`} onClick={() => onDelete(tag)}><Trash2 size={14} />删除</button></div></article>) : <div className="empty"><Settings2 size={30} /><strong>没有匹配的标签</strong><button className="primary-button" onClick={onCreate}><Plus size={15} />新建标签</button></div>}</div></section>;
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
  return <div className="bookmark-grid discovery-grid">{publications.map((publication) => <article className="bookmark-card discovery-card" key={publication.id}><div className="card-top"><div className="favicon"><img src={publication.favicon} alt="" /></div><span className="shared-author">{publication.author.name}</span></div><a href={publication.url} target="_blank" rel="noreferrer"><h3>{publication.title}</h3><span className="domain">{publication.domain}<ArrowUpRight size={12} /></span></a><p>{publication.description || "分享者没有添加描述"}</p><div className="card-bottom"><span className="published-at">{new Date(publication.publishedAt).toLocaleDateString("zh-CN")}</span>{canSave && <button className="secondary-button save-shared" disabled={savedIds.has(publication.id)} onClick={() => onSave(publication)}><Plus size={14} />{savedIds.has(publication.id) ? "已保存" : "保存到我的书签"}</button>}</div></article>)}</div>;
}

function SharedCollectionGrid({ collections, savedIds, canSave, onSave }: { collections: SharedCollection[]; savedIds: Set<string>; canSave: boolean; onSave: (collection: SharedCollection) => void }) {
  return <div className="collection-grid">{collections.map((collection) => <article className="shared-collection-card" key={collection.id}><header><div><span className="shared-author">{collection.author.name}</span><h3>{collection.name}</h3></div><span className="collection-count">{collection.items.length} 条</span></header><p>{collection.description || "作者没有添加合集描述"}</p><div className="collection-preview">{collection.items.slice(0, 4).map((item) => <a href={item.url} target="_blank" rel="noreferrer" key={item.id}><img src={item.favicon} alt="" /><span>{item.title}</span><ArrowUpRight size={12} /></a>)}</div><footer><span>{new Date(collection.updatedAt).toLocaleDateString("zh-CN")} 更新</span>{canSave && <button className="primary-button" disabled={savedIds.has(collection.id)} onClick={() => onSave(collection)}><Plus size={14} />{savedIds.has(collection.id) ? "已保存" : "保存整个合集"}</button>}</footer></article>)}</div>;
}

function SiteGroups({ sites, bookmarks, tags, editable, onAddLink, onEdit }: { sites: Site[]; bookmarks: BookmarkType[]; tags: TagType[]; editable: boolean; onAddLink: (siteId: string) => void; onEdit: (site: Site) => void }) {
  if (!sites.length) return <div className="empty"><Globe2 size={30} /><strong>还没有网站</strong><span>新建网站，或添加书签时让系统自动归站。</span></div>;
  return <div className="site-groups">{sites.map((site) => { const items = bookmarks.filter((bookmark) => bookmark.siteId === site.id); return <section className="site-group" key={site.id}><header><div className="favicon"><img src={site.favicon} alt="" /></div><div><strong>{site.name}</strong><span>{site.domain} · {items.length} 个子链接</span></div>{editable && <div className="site-actions"><button className="icon-button" onClick={() => onEdit(site)} title={`编辑${site.name}`} aria-label={`编辑${site.name}`}><Pencil size={14} /></button><button className="icon-button" onClick={() => onAddLink(site.id)} title={`为${site.name}添加子链接`} aria-label={`为${site.name}添加子链接`}><Plus size={15} /></button></div>}</header>{site.tags.length > 0 && <div className="site-tags">{site.tags.map((id) => { const tag = tags.find((item) => item.id === id); return tag ? <span key={id} style={{ "--tag-color": tag.color } as React.CSSProperties}>#{tag.name}</span> : null; })}</div>}<div className="site-links">{items.map((bookmark) => <a href={bookmark.url} target="_blank" rel="noreferrer" key={bookmark.id}><span>{bookmark.title}</span><ArrowUpRight size={13} /></a>)}</div></section>; })}</div>;
}

function TagManagementPanel({ tags, activeTag, onSelect }: { tags: TagType[]; activeTag: string | null; onSelect: (tag: TagType) => void }) {
  const [search, setSearch] = useState("");
  const ordered = useMemo(() => {
    const children = new globalThis.Map<string | null, TagType[]>();
    tags.forEach((tag) => children.set(tag.parentId, [...(children.get(tag.parentId) || []), tag]));
    const result: Array<{ tag: TagType; depth: number }> = [];
    const visit = (parentId: string | null, depth: number) => (children.get(parentId) || []).forEach((tag) => { result.push({ tag, depth }); visit(tag.id, depth + 1); });
    visit(null, 0);
    return result;
  }, [tags]);
  const visible = ordered.filter(({ tag }) => !search.trim() || tag.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <section className="tag-management-panel" aria-label="标签筛选"><div className="tag-management-header"><span className="nav-label">标签</span>{activeTag && <button type="button" className="tag-clear-button" onClick={() => onSelect(tags.find((tag) => tag.id === activeTag) || tags[0])} aria-label="清除标签筛选" title="清除标签筛选"><X size={13} /></button>}</div><label className="tag-search"><Search size={13} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索标签" aria-label="搜索标签" /></label><button type="button" className={`tag-filter tag-filter-all ${!activeTag ? "active" : ""}`} onClick={() => { if (activeTag) onSelect(tags.find((tag) => tag.id === activeTag) || tags[0]); }}><span className="tag-icon"><LayoutGrid size={14} /></span>全部标签<span>{tags.reduce((sum, tag) => sum + tag.count, 0)}</span></button><div className="tag-cloud">{visible.map(({ tag, depth }) => <button type="button" key={tag.id} className={`tag-filter ${activeTag === tag.id ? "active" : ""}`} style={{ paddingLeft: `${11 + depth * 14}px` }} onClick={() => onSelect(tag)}><span className="tag-icon" style={{ color: tag.color }}><LibraryIcon library={tag.iconLibrary} name={tag.iconName} size={14} /></span><span className="tag-filter-name">{tag.name}</span><span>{tag.count}</span></button>)}</div>{!visible.length && <span className="tag-search-empty">没有匹配的标签</span>}</section>;
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

function BookmarkEditMode({ bookmarks, onEdit, onDelete, onFavorite, onShare }: { bookmarks: BookmarkType[]; onEdit: (bookmark: BookmarkType) => void; onDelete: (bookmark: BookmarkType) => void; onFavorite: (bookmark: BookmarkType) => void; onShare: (bookmark: BookmarkType) => void }) {
  return <div className="bookmark-edit-mode" role="group" aria-label="当前页面书签编辑模式"><div className="edit-mode-hint"><Pencil size={15} /><span>编辑模式：收藏、分享、修改和删除都集中在这里处理</span></div><div className="bookmark-edit-grid">{bookmarks.map((bookmark) => <article className="bookmark-edit-item" key={bookmark.id}><div className="inline-editor-heading"><div className="favicon"><img src={bookmark.favicon} alt="" /></div><div><strong>{bookmark.title}</strong><span>{bookmark.domain}</span></div></div><div className="bookmark-edit-badges"><button className={bookmark.publicationId ? "shared-active" : "tag-action-edit"} onClick={() => onShare(bookmark)} title={bookmark.publicationId ? `取消分享${bookmark.title}` : `分享${bookmark.title}`} aria-label={bookmark.publicationId ? `取消分享${bookmark.title}` : `分享${bookmark.title}`}><Share2 size={14} /></button><button className={bookmark.isFavorite ? "favorite-active" : "tag-action-edit"} onClick={() => onFavorite(bookmark)} title={bookmark.isFavorite ? `取消收藏${bookmark.title}` : `收藏${bookmark.title}`} aria-label={bookmark.isFavorite ? `取消收藏${bookmark.title}` : `收藏${bookmark.title}`}><Star size={14} fill={bookmark.isFavorite ? "currentColor" : "none"} /></button><button className="tag-action-edit" onClick={() => onEdit(bookmark)} title={`编辑${bookmark.title}`} aria-label={`编辑${bookmark.title}`}><Pencil size={14} /></button><button className="tag-action-delete" onClick={() => onDelete(bookmark)} title={`删除${bookmark.title}`} aria-label={`删除${bookmark.title}`}><X size={14} /></button></div></article>)}</div></div>;
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
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [keys, setKeys] = useState<ApiKeyResponse[]>([]);
  const [keyName, setKeyName] = useState("Chrome 扩展");
  const [createdKey, setCreatedKey] = useState("");
  const [keyLoading, setKeyLoading] = useState(true);
  const [keyError, setKeyError] = useState("");
  const [copied, setCopied] = useState(false);
  const passwordChangeRequired = user.passwordChangeRequired === true;

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
    if (newPassword && newPassword !== confirmPassword) { setError("两次输入的新密码不一致"); setSaving(false); return; }
    const responseResult = await fromPromise(apiFetch("/api/v1/account", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, newPassword: newPassword || undefined, confirmPassword: confirmPassword || undefined }) }), () => ({ code: "NETWORK_ERROR", message: "无法连接到服务器" }));
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

  return <div className="modal-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal account-modal"><div className="modal-header"><div><p className="eyebrow">当前账号</p><h2>账号设置</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="关闭"><X size={18} /></button></div><div className="account-tabs" role="tablist" aria-label="账号设置栏目"><button type="button" role="tab" aria-selected={tab === "account"} className={tab === "account" ? "active" : ""} onClick={() => setTab("account")}><Settings2 size={15} />账号</button><button type="button" role="tab" aria-selected={tab === "extension"} className={tab === "extension" ? "active" : ""} onClick={() => setTab("extension")}><KeyRound size={15} />浏览器扩展</button></div>{tab === "account" ? <form onSubmit={(event) => void submit(event)}><label>邮箱<input value={user.email} disabled /></label><label>显示名称<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={60} /></label><div className="form-divider">{passwordChangeRequired ? "设置密码" : "修改密码（可选）"}</div><label>新密码<input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={8} required={passwordChangeRequired} /></label>{newPassword && <label>确认新密码<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} required /></label>}{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" disabled={saving}>{saving ? "保存中..." : passwordChangeRequired ? "设置密码" : "保存设置"}</button></div></form> : <section className="extension-settings" role="tabpanel"><div className="extension-download"><div><span className="extension-icon"><Bookmark size={20} /></span><div><strong>bookmark-nav for Chrome</strong><p>下载后在 Chrome 扩展管理页加载。</p></div></div><a className="primary-button" href="/downloads/bookmark-nav-extension.zip" download><Download size={15} />下载扩展</a></div><div className="key-create"><div><strong>扩展 API Key</strong><p>密钥仅在创建时显示，请直接导入扩展。</p></div><div className="key-create-row"><input aria-label="API Key 名称" value={keyName} onChange={(event) => setKeyName(event.target.value)} maxLength={60} /><button type="button" className="secondary-button" disabled={keyLoading || !keyName.trim()} onClick={() => void generateKey()}><Plus size={15} />创建</button></div></div>{createdKey && <div className="created-key"><div><KeyRound size={16} /><span><strong>新密钥已创建</strong><small>关闭后将无法再次查看</small></span></div><div className="key-value"><code>{createdKey}</code><button type="button" className="icon-button" onClick={() => void copyCreatedKey()} title="复制 API Key" aria-label="复制 API Key">{copied ? <Check size={16} /> : <Copy size={16} />}</button></div></div>}<div className="key-list-heading"><strong>已创建的密钥</strong><span>{keys.length} 个</span></div><div className="key-list">{keyLoading && !keys.length ? <p>正在加载...</p> : keys.length ? keys.map((key) => <div className="key-row" key={key.id}><span><strong>{key.name}</strong><code>{key.prefix}</code></span><span className="key-meta">{key.lastUsedAt ? `${new Date(key.lastUsedAt).toLocaleDateString("zh-CN")} 使用` : "尚未使用"}</span><button type="button" className="icon-button key-revoke" onClick={() => void revokeKey(key)} title={`撤销${key.name}`} aria-label={`撤销${key.name}`}><Trash2 size={15} /></button></div>) : <div className="key-empty">还没有扩展密钥</div>}</div>{keyError && <p className="form-error" role="alert">{keyError}</p>}</section>}</div></div>;
}

function FolderModal({ folder, onClose, onSaved }: { folder: FolderType | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(folder?.name || "");
  const [iconLibraryName, setIconLibraryName] = useState<IconLibrary>(folder?.iconLibrary || "lucide");
  const [iconName, setIconName] = useState(folder?.iconName || "Folder");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault(); setSaving(true); setError("");
    const responseResult = await fromPromise(apiFetch(folder ? `/api/v1/folders/${folder.id}` : "/api/v1/folders", { method: folder ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, iconLibrary: iconLibraryName, iconName }) }), () => ({ code: "NETWORK_ERROR", message: "无法连接到服务器" }));
    if (!responseResult.ok) { setError(responseResult.error.message); setSaving(false); return; }
    const bodyResult = await fromPromise(responseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }));
    const parsed = bodyResult.ok ? folderResponse.safeParse(bodyResult.value) : null;
    if (!responseResult.value.ok || !parsed?.success) { setError(bodyResult.ok && typeof bodyResult.value === "object" && bodyResult.value !== null && "error" in bodyResult.value && typeof bodyResult.value.error === "string" ? bodyResult.value.error : "目录保存失败"); setSaving(false); return; }
    onSaved(); setSaving(false);
  }
  return <div className="modal-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="modal compact-modal" onSubmit={(event) => void submit(event)}><div className="modal-header"><div><p className="eyebrow">目录管理</p><h2>{folder ? "编辑目录" : "创建目录"}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="关闭"><X size={18} /></button></div><label>名称<input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} required autoFocus /></label><label>图标库<select value={iconLibraryName} onChange={(event) => setIconLibraryName(event.target.value as IconLibrary)}><option value="lucide">Lucide</option><option value="emoji">Emoji</option><option value="custom">自定义文本</option></select></label><label>图标名称<div className="icon-input"><span><LibraryIcon library={iconLibraryName} name={iconName} size={17} /></span><input value={iconName} onChange={(event) => setIconName(event.target.value)} maxLength={32} placeholder={iconLibraryName === "lucide" ? "例如 Folder、Code2" : iconLibraryName === "emoji" ? "选择下方 Emoji 或直接输入" : "输入一个字符或文本"} /></div></label><IconNamePicker library={iconLibraryName} value={iconName} onChange={setIconName} label="目录图标" />{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" disabled={saving}>{saving ? "保存中..." : "保存目录"}</button></div></form></div>;
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
  const [iconLibraryName, setIconLibraryName] = useState<IconLibrary>(tag?.iconLibrary || "lucide");
  const [iconName, setIconName] = useState(tag?.iconName || "Tag");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault(); setSaving(true); setError("");
    const responseResult = await fromPromise(apiFetch(tag ? `/api/v1/tags/${tag.id}` : "/api/v1/tags", { method: tag ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, color, iconLibrary: iconLibraryName, iconName, parentId: parentId || null }) }), () => ({ code: "NETWORK_ERROR", message: "无法连接到服务器" }));
    if (!responseResult.ok) { setError(responseResult.error.message); setSaving(false); return; }
    const bodyResult = await fromPromise(responseResult.value.json() as Promise<JsonValue>, () => ({ code: "INVALID_RESPONSE", message: "服务器返回无效响应" }));
    const parsed = bodyResult.ok ? tagResponse.safeParse(bodyResult.value) : null;
    if (!responseResult.value.ok || !parsed?.success) { setError(bodyResult.ok && typeof bodyResult.value === "object" && bodyResult.value !== null && "error" in bodyResult.value && typeof bodyResult.value.error === "string" ? bodyResult.value.error : "标签保存失败"); setSaving(false); return; }
    onSaved(); setSaving(false);
  }
  return <div className="modal-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="modal compact-modal" onSubmit={(event) => void submit(event)}><div className="modal-header"><div><p className="eyebrow">标签管理</p><h2>{tag ? "编辑标签" : "创建标签"}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="关闭"><X size={18} /></button></div><label>名称<input value={name} onChange={(event) => setName(event.target.value)} maxLength={30} required autoFocus /></label><label>图标库<select value={iconLibraryName} onChange={(event) => setIconLibraryName(event.target.value as IconLibrary)}><option value="lucide">Lucide</option><option value="emoji">Emoji</option><option value="custom">自定义文本</option></select></label><label>图标名称<div className="icon-input"><span><LibraryIcon library={iconLibraryName} name={iconName} size={17} /></span><input value={iconName} onChange={(event) => setIconName(event.target.value)} maxLength={32} placeholder={iconLibraryName === "lucide" ? "例如 Tag、Code2" : iconLibraryName === "emoji" ? "选择下方 Emoji 或直接输入" : "输入一个字符或文本"} /></div></label><IconNamePicker library={iconLibraryName} value={iconName} onChange={setIconName} label="标签图标" /><label>父标签<select value={parentId} onChange={(event) => setParentId(event.target.value)}><option value="">顶级标签</option>{tags.filter((item) => !item.parentId && item.id !== tag?.id).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>颜色<div className="color-field"><input type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="标签颜色" /><input value={color} onChange={(event) => setColor(event.target.value)} pattern="#[0-9a-fA-F]{6}" required /></div></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" disabled={saving}>{saving ? "保存中..." : "保存标签"}</button></div></form></div>;
}

function BookmarkCard({ bookmark, tags, sites, onFavorite, onShare, onClick }: { bookmark: BookmarkType; tags: DashboardData["tags"]; sites: Site[]; onFavorite: () => void; onShare: () => void; onClick: () => void }) { return <article className="bookmark-card" role="listitem"><div className="card-top"><div className="favicon"><img src={bookmark.favicon} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /></div><div className="bookmark-actions"><button type="button" className={`more-button ${bookmark.publicationId ? "shared-active" : ""}`} aria-label={bookmark.publicationId ? "取消分享" : "分享书签"} title={bookmark.publicationId ? "取消分享" : "分享书签"} onClick={onShare}><Share2 size={17} /></button><button type="button" className={`more-button ${bookmark.isFavorite ? "favorite-active" : ""}`} aria-label={bookmark.isFavorite ? "取消收藏" : "收藏书签"} title={bookmark.isFavorite ? "取消收藏" : "收藏书签"} onClick={onFavorite}><Star size={18} fill={bookmark.isFavorite ? "currentColor" : "none"} /></button></div></div><a href={bookmark.url} target="_blank" rel="noreferrer" onClick={onClick}><h3>{bookmark.title}</h3><span className="domain">{bookmark.domain}<ArrowUpRight size={12} /></span></a><p>{bookmark.description}</p><div className="card-bottom"><div className="card-tags">{effectiveTagIds(bookmark, sites).map((id) => <span key={id} style={{ "--tag-color": tagColor(id, tags) } as React.CSSProperties}>#{tags.find((tag) => tag.id === id)?.name}</span>)}</div><span className="clicks"><BarChart3 size={13} />{bookmark.clicks}</span></div></article>; }

function BookmarkCircle({ bookmark, onClick }: { bookmark: BookmarkType; onClick: () => void }) {
  return <article className="bookmark-circle-item" role="listitem"><a href={bookmark.url} target="_blank" rel="noreferrer" onClick={onClick}><span className="circle-favicon"><img src={bookmark.favicon} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /></span><strong>{bookmark.title}</strong></a></article>;
}

function BookmarkCompactRow({ bookmark, onClick }: { bookmark: BookmarkType; onClick: () => void }) {
  return <article className="bookmark-compact-row" role="listitem"><a href={bookmark.url} target="_blank" rel="noreferrer" onClick={onClick}><strong>{bookmark.title}</strong><span>{bookmark.domain}</span><span className="compact-favicon"><img src={bookmark.favicon} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /></span></a></article>;
}

function BookmarkListRow({ bookmark, tags, sites, onFavorite, onShare, onClick }: { bookmark: BookmarkType; tags: DashboardData["tags"]; sites: Site[]; onFavorite: () => void; onShare: () => void; onClick: () => void }) {
  return <article className="bookmark-list-row" role="listitem"><div className="favicon"><img src={bookmark.favicon} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /></div><div className="list-main"><a href={bookmark.url} target="_blank" rel="noreferrer" onClick={onClick}><strong>{bookmark.title}</strong><span className="domain">{bookmark.domain}<ArrowUpRight size={12} /></span></a><p>{bookmark.description || "暂无描述"}</p></div><div className="list-tags">{effectiveTagIds(bookmark, sites).map((id) => <span key={id} style={{ "--tag-color": tagColor(id, tags) } as React.CSSProperties}>#{tags.find((tag) => tag.id === id)?.name}</span>)}</div><span className="clicks"><BarChart3 size={13} />{bookmark.clicks}</span><div className="bookmark-actions"><button type="button" className={`more-button ${bookmark.publicationId ? "shared-active" : ""}`} aria-label={bookmark.publicationId ? "取消分享" : "分享书签"} onClick={onShare}><Share2 size={16} /></button><button type="button" className={`more-button ${bookmark.isFavorite ? "favorite-active" : ""}`} aria-label={bookmark.isFavorite ? "取消收藏" : "收藏书签"} onClick={onFavorite}><Star size={17} fill={bookmark.isFavorite ? "currentColor" : "none"} /></button></div></article>;
}

function BookmarkTable({ bookmarks, folders, tags, sites, onFavorite, onShare, onClick }: { bookmarks: BookmarkType[]; folders: DashboardData["folders"]; tags: DashboardData["tags"]; sites: Site[]; onFavorite: (bookmark: BookmarkType) => void; onShare: (bookmark: BookmarkType) => void; onClick: (bookmark: BookmarkType) => void }) {
  return <div className="bookmark-table-wrap"><table className="bookmark-table"><thead><tr><th>书签</th><th>目录</th><th>标签</th><th>访问</th><th>添加时间</th><th aria-label="操作" /></tr></thead><tbody>{bookmarks.map((bookmark) => <tr key={bookmark.id}><td><div className="table-title"><div className="favicon"><img src={bookmark.favicon} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /></div><a href={bookmark.url} target="_blank" rel="noreferrer" onClick={() => onClick(bookmark)}><strong>{bookmark.title}</strong><span>{bookmark.domain}</span></a></div></td><td>{folders.find((folder) => folder.id === bookmark.folderId)?.name || "未分类"}</td><td><div className="list-tags">{effectiveTagIds(bookmark, sites).map((id) => <span key={id} style={{ "--tag-color": tagColor(id, tags) } as React.CSSProperties}>#{tags.find((tag) => tag.id === id)?.name}</span>)}</div></td><td><span className="clicks"><BarChart3 size={13} />{bookmark.clicks}</span></td><td>{new Date(bookmark.createdAt).toLocaleDateString("zh-CN")}</td><td><div className="bookmark-actions"><button type="button" className={`more-button ${bookmark.publicationId ? "shared-active" : ""}`} aria-label={bookmark.publicationId ? "取消分享" : "分享书签"} onClick={() => onShare(bookmark)}><Share2 size={15} /></button><button type="button" className={`more-button ${bookmark.isFavorite ? "favorite-active" : ""}`} aria-label={bookmark.isFavorite ? "取消收藏" : "收藏书签"} onClick={() => onFavorite(bookmark)}><Star size={16} fill={bookmark.isFavorite ? "currentColor" : "none"} /></button></div></td></tr>)}</tbody></table></div>;
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
