"use client";

import { useState } from "react";
import type React from "react";
import { z } from "zod";
import {
  Activity,
  Archive,
  Bell,
  BookOpen,
  Briefcase,
  CalendarDays,
  Camera,
  Cloud,
  Code2,
  Database,
  FileText,
  Film,
  Flag,
  Folder,
  FolderOpen,
  Gamepad2,
  Globe2,
  GraduationCap,
  Hammer,
  Headphones,
  Heart,
  Image,
  Inbox,
  LayoutGrid,
  Lightbulb,
  LifeBuoy,
  Link,
  Lock,
  Map as MapIcon,
  MessageCircle,
  Monitor,
  Music,
  Package,
  Palette,
  Plane,
  Rocket,
  Rss,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  Terminal,
  ThumbsUp,
  Trophy,
  Tv,
  Users,
  Wallet,
  Wifi,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { DashboardData } from "../../lib/types";
import type { Bookmark as BookmarkType } from "../../lib/types";
import type { IconLibrary, Site } from "@loomark/shared";
import type { ThemeMode } from "../theme-provider";
import type { ThemeId } from "../theme-config";
import { THEME_PRESETS } from "../theme-config";

export const SESSION_CHECK_TIMEOUT_MS = 3000;

export const importedTagSchema = z.object({
  name: z.string().trim().min(1).max(30),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#536dfe"),
  iconLibrary: z.enum(["lucide", "emoji", "custom"]).default("lucide"),
  iconName: z.string().trim().min(1).max(32).default("Tag"),
  parentName: z.string().trim().min(1).nullable().default(null),
});
export const importedFolderSchema = z.object({
  name: z.string().trim().min(1).max(40),
  iconLibrary: z.enum(["lucide", "emoji", "custom"]).default("lucide"),
  iconName: z.string().trim().min(1).max(32).default("Folder"),
});
export const importedBookmarkSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  description: z.string().optional(),
  folderName: z.string().trim().min(1).nullable().default(null),
  tags: z.array(z.string().trim().min(1)).default([]),
  isFavorite: z.boolean().default(false),
});
export const importedBookmarkPayloadSchema = z.object({
  format: z.literal("bookmark-nav-bookmarks").optional(),
  version: z.literal(1).optional(),
  folders: z.array(importedFolderSchema).default([]),
  tags: z.array(importedTagSchema).default([]),
  bookmarks: z.array(importedBookmarkSchema).min(1),
});
export const importedTagsSchema = z.union([
  z.array(importedTagSchema),
  z.object({ tags: z.array(importedTagSchema) }),
]);
export type ImportedFolder = z.infer<typeof importedFolderSchema>;
export type ImportedTag = z.infer<typeof importedTagSchema>;

export const tagColor = (id: string, tags: DashboardData["tags"]) =>
  tags.find((tag) => tag.id === id)?.color || "#94a3b8";

export const effectiveTagIds = (bookmark: BookmarkType, sites: Site[]) =>
  Array.from(
    new Set([
      ...(sites.find((site) => site.id === bookmark.siteId)?.tags || []),
      ...bookmark.tags,
    ]),
  );

export const accountIdentifier = (email: string) =>
  email.endsWith("@bookmark-nav.local") && email.startsWith("feishu-")
    ? "飞书授权账号"
    : email;

const iconLibrary: Record<string, LucideIcon> = {
  Activity,
  Archive,
  Bell,
  BookOpen,
  Briefcase,
  CalendarDays,
  Camera,
  Cloud,
  Code2,
  Database,
  FileText,
  Film,
  Flag,
  Folder,
  FolderOpen,
  Gamepad2,
  Globe2,
  GraduationCap,
  Hammer,
  Headphones,
  Heart,
  Image,
  Inbox,
  LayoutGrid,
  Lightbulb,
  LifeBuoy,
  Link,
  Lock,
  Map: MapIcon,
  MessageCircle,
  Monitor,
  Music,
  Package,
  Palette,
  Plane,
  Rocket,
  Rss,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  Terminal,
  ThumbsUp,
  Trophy,
  Tv,
  Users,
  Wallet,
  Wifi,
  Wrench,
};

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

export function LibraryIcon({ library = "lucide", name, size = 16 }: { library?: IconLibrary; name?: string; size?: number }) {
  const Icon = library === "lucide" && name ? iconLibrary[name] : undefined;
  return Icon ? <Icon size={size} strokeWidth={1.9} aria-hidden="true" /> : <span className="legacy-icon" aria-hidden="true">{name || "Folder"}</span>;
}

export function IconNamePicker({ library, value, onChange, label }: { library: IconLibrary; value: string; onChange: (value: string) => void; label: string }) {
  const [activeGroup, setActiveGroup] = useState("general");
  const groups = library === "emoji" ? emojiGroups : iconGroups;
  const group = groups.find((item) => item.id === activeGroup) || groups[0];
  if (library === "custom") return null;
  return <div className="icon-picker" aria-label={label}><span className="field-label">{library === "emoji" ? "Emoji 图标" : "Lucide 图标"}</span><div className="icon-picker-tabs" role="tablist" aria-label={`${label}分类`}>{groups.map((item) => <button type="button" role="tab" aria-selected={group.id === item.id} className={group.id === item.id ? "active" : ""} key={item.id} onClick={() => setActiveGroup(item.id)}>{item.label}</button>)}</div><div className="icon-picker-options">{group.icons.map((choice) => <button type="button" key={choice} className={value === choice ? "picked" : ""} onClick={() => onChange(choice)} aria-label={`选择${choice}图标`} title={choice}><LibraryIcon library={library} name={choice} size={17} /></button>)}</div></div>;
}

export function apiFetch(input: RequestInfo | URL, init?: RequestInit, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  return globalThis.fetch(input, { ...init, credentials: "include", signal: controller.signal }).finally(() => {
    window.clearTimeout(timeoutId);
  });
}

function isNestedInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("a, button, input, select, textarea, label, [contenteditable='true']") !== null;
}

function openBookmarkSurface(url: string, onTrackedClick: () => void): void {
  window.open(url, "_blank", "noopener,noreferrer");
  onTrackedClick();
}

export function handleBookmarkSurfaceClick(event: React.MouseEvent<HTMLElement>, url: string, onTrackedClick: () => void): void {
  if (isNestedInteractiveTarget(event.target)) return;
  openBookmarkSurface(url, onTrackedClick);
}

export function handleBookmarkSurfaceKeyDown(event: React.KeyboardEvent<HTMLElement>, url: string, onTrackedClick: () => void): void {
  if (isNestedInteractiveTarget(event.target) || (event.key !== "Enter" && event.key !== " ")) return;
  event.preventDefault();
  openBookmarkSurface(url, onTrackedClick);
}

export type ManagementSection = "bookmarks" | "folders" | "tags" | "sites" | "sharing";
export type QuerySource = "table" | "view";
export type QueryLogic = "and" | "or";
export type QueryOperator = "contains" | "equals" | "notEquals" | "gt" | "lt" | "isEmpty" | "isNotEmpty";
export type QueryValue = string | number | boolean | string[] | null | undefined;
export type TagMatchMode = "and" | "or";
export type QueryField<T> = { id: string; label: string; source: QuerySource; operators: QueryOperator[]; getValue: (item: T) => QueryValue; options?: { label: string; value: string }[]; placeholder?: string };
export type QueryCondition = { id: string; fieldId: string; operator: QueryOperator; value: string };
export type QueryState = { source: QuerySource; logic: QueryLogic; conditions: QueryCondition[]; page: number; pageSize: number };

export const operatorLabels: Record<QueryOperator, string> = { contains: "包含", equals: "等于", notEquals: "不等于", gt: "大于", lt: "小于", isEmpty: "为空", isNotEmpty: "不为空" };
export const operatorNeedsValue = (operator: QueryOperator): boolean => operator !== "isEmpty" && operator !== "isNotEmpty";
export const makeCondition = (fieldId: string, operator: QueryOperator = "contains"): QueryCondition => ({ id: `condition-${Date.now()}-${Math.random().toString(16).slice(2)}`, fieldId, operator, value: "" });
export const makeQueryState = (fieldId: string): QueryState => ({ source: "view", logic: "and", conditions: [{ id: `initial-${fieldId}`, fieldId, operator: "contains", value: "" }], page: 1, pageSize: 10 });

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

export function filterByQuery<T>(items: T[], fields: QueryField<T>[], state: QueryState, quickSearch = ""): T[] {
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

export function pageSlice<T>(items: T[], state: QueryState): { items: T[]; page: number; pageSize: number; total: number; totalPages: number } {
  const totalPages = items.length === 0 ? 0 : Math.ceil(items.length / state.pageSize);
  const page = totalPages === 0 ? 1 : Math.min(state.page, totalPages);
  return { items: items.slice((page - 1) * state.pageSize, page * state.pageSize), page, pageSize: state.pageSize, total: items.length, totalPages };
}

export function LoadingState() {
  return <div className="loading-state" aria-label="正在加载书签" aria-busy="true"><div className="loading-toolbar"><span className="skeleton-line medium" /><span className="skeleton-line short" /></div><div className="loading-grid">{["one", "two", "three", "four", "five", "six"].map((key) => <div className="bookmark-card skeleton-bookmark" key={key}><span className="skeleton-block skeleton-favicon" /><span className="skeleton-line medium" /><span className="skeleton-line long" /><span className="skeleton-line paragraph" /><div className="skeleton-footer"><span className="skeleton-line tag" /><span className="skeleton-line tiny" /></div></div>)}</div></div>;
}

export function ThemeSwitcher({ mode, setMode, themeId, setThemeId }: { mode: ThemeMode; setMode: (mode: ThemeMode) => void; themeId: ThemeId; setThemeId: (themeId: ThemeId) => void }) {
  return <div className="theme-switcher"><div><span className="field-label">主题</span><div className="theme-mode-row" role="group" aria-label="主题模式"><button type="button" className={mode === "system" ? "active" : ""} onClick={() => setMode("system")}>跟随系统</button><button type="button" className={mode === "light" ? "active" : ""} onClick={() => setMode("light")}>浅色</button><button type="button" className={mode === "dark" ? "active" : ""} onClick={() => setMode("dark")}>深色</button></div></div><div className="theme-grid">{THEME_PRESETS.map((preset) => <button type="button" key={preset.id} className={themeId === preset.id ? "active" : ""} onClick={() => setThemeId(preset.id)} title={preset.description}><span style={{ background: preset.preview }} />{preset.name}</button>)}</div></div>;
}
