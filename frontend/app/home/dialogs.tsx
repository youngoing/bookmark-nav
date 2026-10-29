"use client";

import { useEffect, useState } from "react";
import type React from "react";
import {
  ArrowUpRight,
  BarChart3,
  Bookmark,
  Check,
  Copy,
  Download,
  KeyRound,
  Plus,
  Settings2,
  Share2,
  Star,
  Trash2,
  X,
} from "lucide-react";
import type { Bookmark as BookmarkType, DashboardData } from "../../lib/types";
import {
  apiKeyCreatedResponse,
  apiKeyListResponse,
  bookmarkResponse,
  folderResponse,
  fromPromise,
  sessionResponse,
  sharedCollectionResponse,
  siteResponse,
  tagResponse,
  type ApiKeyResponse,
  type Folder as FolderType,
  type IconLibrary,
  type JsonValue,
  type Site,
  type Tag as TagType,
  type UserResponse,
} from "@loomark/shared";
import {
  accountIdentifier,
  apiFetch,
  effectiveTagIds,
  IconNamePicker,
  LibraryIcon,
} from "./shared";

type DialogHostProps = {
  user: UserResponse;
  showAdd: boolean;
  initialSiteId: string | null;
  editingBookmark: BookmarkType | null;
  showAccount: boolean;
  folderEditor: FolderType | "new" | null;
  tagEditor: TagType | "new" | null;
  siteEditor: Site | "new" | null;
  publishingTag: TagType | null;
  folders: DashboardData["folders"];
  tags: DashboardData["tags"];
  sites: Site[];
  bookmarks: BookmarkType[];
  onCloseAdd: () => void;
  onAdded: (bookmark: BookmarkType) => void;
  onCloseEditBookmark: () => void;
  onBookmarkSaved: (bookmark: BookmarkType) => void;
  onCloseAccount: () => void;
  onAccountSaved: (user: UserResponse) => void;
  onCloseFolder: () => void;
  onFolderSaved: () => void;
  onCloseTag: () => void;
  onTagSaved: () => void;
  onCloseSite: () => void;
  onSiteSaved: () => void;
  onClosePublishCollection: () => void;
  onPublishCollectionSaved: () => void;
};

export default function DialogHost({
  user,
  showAdd,
  initialSiteId,
  editingBookmark,
  showAccount,
  folderEditor,
  tagEditor,
  siteEditor,
  publishingTag,
  folders,
  tags,
  sites,
  bookmarks,
  onCloseAdd,
  onAdded,
  onCloseEditBookmark,
  onBookmarkSaved,
  onCloseAccount,
  onAccountSaved,
  onCloseFolder,
  onFolderSaved,
  onCloseTag,
  onTagSaved,
  onCloseSite,
  onSiteSaved,
  onClosePublishCollection,
  onPublishCollectionSaved,
}: DialogHostProps) {
  return <>
    {showAdd && <AddBookmarkModal folders={folders} tags={tags} sites={sites} initialSiteId={initialSiteId} onClose={onCloseAdd} onAdded={onAdded} />}
    {editingBookmark && <EditBookmarkModal bookmarks={[editingBookmark]} folders={folders} tags={tags} sites={sites} onClose={onCloseEditBookmark} onSaved={onBookmarkSaved} />}
    {showAccount && <AccountModal user={user} onClose={onCloseAccount} onSaved={onAccountSaved} />}
    {folderEditor && <FolderModal folder={folderEditor === "new" ? null : folderEditor} onClose={onCloseFolder} onSaved={onFolderSaved} />}
    {tagEditor && <TagModal tag={tagEditor === "new" ? null : tagEditor} tags={tags} onClose={onCloseTag} onSaved={onTagSaved} />}
    {siteEditor && <SiteModal site={siteEditor === "new" ? null : siteEditor} folders={folders} tags={tags} onClose={onCloseSite} onSaved={onSiteSaved} />}
    {publishingTag && <PublishCollectionModal tag={publishingTag} bookmarks={bookmarks} sites={sites} onClose={onClosePublishCollection} onSaved={onPublishCollectionSaved} />}
  </>;
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

  return <div className="modal-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal account-modal"><div className="modal-header"><div><p className="eyebrow">当前账号</p><h2>账号设置</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="关闭"><X size={18} /></button></div><div className="account-tabs" role="tablist" aria-label="账号设置栏目"><button type="button" role="tab" aria-selected={tab === "account"} className={tab === "account" ? "active" : ""} onClick={() => setTab("account")}><Settings2 size={15} />账号</button><button type="button" role="tab" aria-selected={tab === "extension"} className={tab === "extension" ? "active" : ""} onClick={() => setTab("extension")}><KeyRound size={15} />浏览器扩展</button></div>{tab === "account" ? <form onSubmit={(event) => void submit(event)}><label>账号<input value={accountIdentifier(user.email)} disabled /></label><label>显示名称<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={60} /></label><div className="form-divider">{passwordChangeRequired ? "设置密码" : "修改密码（可选）"}</div><label>新密码<input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={8} required={passwordChangeRequired} /></label>{newPassword && <label>确认新密码<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} required /></label>}{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" disabled={saving}>{saving ? "保存中..." : passwordChangeRequired ? "设置密码" : "保存设置"}</button></div></form> : <section className="extension-settings" role="tabpanel"><div className="extension-download"><div><span className="extension-icon"><Bookmark size={20} /></span><div><strong>bookmark-nav for Chrome</strong><p>下载后在 Chrome 扩展管理页加载。</p></div></div><a className="primary-button" href="/downloads/bookmark-nav-extension.zip" download><Download size={15} />下载扩展</a></div><div className="key-create"><div><strong>扩展 API Key</strong><p>密钥仅在创建时显示，请直接导入扩展。</p></div><div className="key-create-row"><input aria-label="API Key 名称" value={keyName} onChange={(event) => setKeyName(event.target.value)} maxLength={60} /><button type="button" className="secondary-button" disabled={keyLoading || !keyName.trim()} onClick={() => void generateKey()}><Plus size={15} />创建</button></div></div>{createdKey && <div className="created-key"><div><KeyRound size={16} /><span><strong>新密钥已创建</strong><small>关闭后将无法再次查看</small></span></div><div className="key-value"><code>{createdKey}</code><button type="button" className="icon-button" onClick={() => void copyCreatedKey()} title="复制 API Key" aria-label="复制 API Key">{copied ? <Check size={16} /> : <Copy size={16} />}</button></div></div>}<div className="key-list-heading"><strong>已创建的密钥</strong><span>{keys.length} 个</span></div><div className="key-list">{keyLoading && !keys.length ? <p>正在加载...</p> : keys.length ? keys.map((key) => <div className="key-row" key={key.id}><span><strong>{key.name}</strong><code>{key.prefix}</code></span><span className="key-meta">{key.lastUsedAt ? `${new Date(key.lastUsedAt).toLocaleDateString("zh-CN")} 使用` : "尚未使用"}</span><button type="button" className="icon-button key-revoke" onClick={() => void revokeKey(key)} title={`撤销${key.name}`} aria-label={`撤销${key.name}`}><Trash2 size={15} /></button></div>) : <div className="key-empty">还没有扩展密钥</div>}</div>{keyError && <p className="form-error" role="alert">{keyError}</p>}</section>}</div></div>;
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
