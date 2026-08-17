const byId = (id) => document.getElementById(id);
const setup = byId("setup");
const capture = byId("capture");
const settings = byId("settings");
let activeTab = null;
let tags = [];
let folders = [];
const selectedTagIds = new Set();

function normalizeEndpoint(value) {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("服务地址必须使用 HTTP 或 HTTPS");
  return url.origin;
}

function setStatus(target, message, isError = false) {
  target.textContent = message;
  target.classList.toggle("error", isError);
}

function showCapture(endpoint) {
  setup.classList.add("hidden");
  capture.classList.remove("hidden");
  settings.classList.remove("hidden");
  settings.title = `当前服务：${endpoint}`;
}

function showSetup() {
  capture.classList.add("hidden");
  setup.classList.remove("hidden");
  settings.classList.add("hidden");
}

async function request(endpoint, apiKey, path, init = {}) {
  const response = await fetch(`${endpoint}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      authorization: `Bearer ${apiKey}`,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || `请求失败 (${response.status})`);
  }
  return response;
}

async function loadWorkspace(endpoint, apiKey) {
  const response = await request(endpoint, apiKey, "/api/v1/dashboard");
  const body = await response.json();
  if (!body || typeof body !== "object" || !Array.isArray(body.tags) || !Array.isArray(body.folders)) throw new Error("工作区数据无效");
  tags = body.tags.filter((tag) =>
    tag &&
    typeof tag.id === "string" &&
    typeof tag.name === "string" &&
    typeof tag.color === "string" &&
    (tag.parentId === null || typeof tag.parentId === "string")
  );
  folders = body.folders.filter((folder) =>
    folder &&
    folder.id !== "all" &&
    typeof folder.id === "string" &&
    typeof folder.name === "string" &&
    typeof folder.icon === "string"
  );
  selectedTagIds.clear();
  renderTags();
  renderFolders();
}

function orderedTags() {
  const children = new Map();
  for (const tag of tags) {
    const key = tag.parentId || "";
    if (!children.has(key)) children.set(key, []);
    children.get(key).push(tag);
  }
  const result = [];
  const visited = new Set();
  function append(parentId, depth) {
    for (const tag of children.get(parentId) || []) {
      if (visited.has(tag.id)) continue;
      visited.add(tag.id);
      result.push({ tag, depth });
      append(tag.id, depth + 1);
    }
  }
  append("", 0);
  for (const tag of tags) {
    if (!visited.has(tag.id)) result.push({ tag, depth: 0 });
  }
  return result;
}

function renderTags() {
  const list = byId("tagList");
  list.replaceChildren();
  byId("tagCount").textContent = `${selectedTagIds.size} 个已选`;
  if (!tags.length) {
    const message = document.createElement("span");
    message.className = "tag-message";
    message.textContent = "工作区还没有标签";
    list.append(message);
    return;
  }
  for (const { tag, depth } of orderedTags()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tag-option${depth ? " child" : ""}${selectedTagIds.has(tag.id) ? " selected" : ""}`;
    button.style.setProperty("--tag-color", tag.color);
    button.setAttribute("aria-pressed", String(selectedTagIds.has(tag.id)));
    const dot = document.createElement("span");
    dot.className = "tag-dot";
    const name = document.createElement("span");
    name.textContent = `${depth ? "└ " : ""}${tag.name}`;
    button.append(dot, name);
    button.addEventListener("click", () => {
      if (selectedTagIds.has(tag.id)) selectedTagIds.delete(tag.id);
      else selectedTagIds.add(tag.id);
      renderTags();
    });
    list.append(button);
  }
}

function renderFolders() {
  const select = byId("folderId");
  select.replaceChildren();
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "继承网站或未分类";
  select.append(defaultOption);
  for (const folder of folders) {
    const option = document.createElement("option");
    option.value = folder.id;
    option.textContent = `${folder.icon} ${folder.name}`;
    select.append(option);
  }
}

async function readPageDescription(tab) {
  if (!tab?.id || !/^https?:/.test(tab.url || "")) return "";
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () =>
        document.querySelector('meta[name="description"]')?.getAttribute("content") ||
        document.querySelector('meta[property="og:description"]')?.getAttribute("content") ||
        "",
    });
    return typeof result?.result === "string" ? result.result.trim() : "";
  } catch {
    return "";
  }
}

async function loadActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTab = tab || null;
  const url = tab?.url || "";
  const title = tab?.title || url;
  byId("pageTitle").textContent = title;
  byId("pageUrl").textContent = url;
  byId("title").value = title;
  byId("url").value = url;
  byId("description").value = await readPageDescription(tab);
  byId("favicon").src = tab?.favIconUrl || `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(url)}&sz=64`;
}

async function restore() {
  await loadActiveTab();
  const stored = await chrome.storage.local.get(["endpoint", "apiKey"]);
  if (stored.endpoint) byId("endpoint").value = stored.endpoint;
  if (!stored.endpoint || !stored.apiKey) {
    showSetup();
    return;
  }
  byId("apiKey").value = stored.apiKey;
  showCapture(stored.endpoint);
  try {
    await loadWorkspace(stored.endpoint, stored.apiKey);
    setStatus(byId("captureStatus"), "");
  } catch (error) {
    setStatus(byId("captureStatus"), error instanceof Error ? error.message : "工作区加载失败", true);
  }
}

byId("connect").addEventListener("click", async () => {
  const button = byId("connect");
  button.disabled = true;
  setStatus(byId("setupStatus"), "正在验证...");
  try {
    const endpoint = normalizeEndpoint(byId("endpoint").value.trim());
    const apiKey = byId("apiKey").value.trim();
    if (!apiKey) throw new Error("请输入 API Key");
    await loadWorkspace(endpoint, apiKey);
    await chrome.storage.local.set({ endpoint, apiKey });
    showCapture(endpoint);
    setStatus(byId("captureStatus"), "");
  } catch (error) {
    setStatus(byId("setupStatus"), error instanceof Error ? error.message : "连接失败", true);
  } finally {
    button.disabled = false;
  }
});

byId("save").addEventListener("click", async () => {
  const button = byId("save");
  button.disabled = true;
  setStatus(byId("captureStatus"), "正在保存...");
  try {
    const url = byId("url").value.trim();
    if (!/^https?:\/\//i.test(url)) throw new Error("请输入有效的 HTTP 或 HTTPS 链接");
    const stored = await chrome.storage.local.get(["endpoint", "apiKey"]);
    if (!stored.endpoint || !stored.apiKey) throw new Error("请先配置 API Key");
    await request(stored.endpoint, stored.apiKey, "/api/v1/bookmarks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url,
        title: byId("title").value.trim() || activeTab?.title || url,
        description: byId("description").value.trim(),
        folderId: byId("folderId").value || null,
        tags: [...selectedTagIds],
      }),
    });
    setStatus(byId("captureStatus"), "已保存到 bookmark-nav");
    byId("captureStatus").classList.add("success");
  } catch (error) {
    byId("captureStatus").classList.remove("success");
    setStatus(byId("captureStatus"), error instanceof Error ? error.message : "保存失败", true);
  } finally {
    button.disabled = false;
  }
});

settings.addEventListener("click", () => {
  showSetup();
  setStatus(byId("setupStatus"), "");
});

void restore();
