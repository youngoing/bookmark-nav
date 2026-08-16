const byId = (id) => document.getElementById(id);
const setup = byId("setup");
const capture = byId("capture");
const settings = byId("settings");
let activeTab = null;

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

async function loadActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTab = tab || null;
  const url = tab?.url || "";
  const title = tab?.title || url;
  byId("pageTitle").textContent = title;
  byId("pageUrl").textContent = url;
  byId("title").value = title;
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
}

byId("connect").addEventListener("click", async () => {
  const button = byId("connect");
  button.disabled = true;
  setStatus(byId("setupStatus"), "正在验证...");
  try {
    const endpoint = normalizeEndpoint(byId("endpoint").value.trim());
    const apiKey = byId("apiKey").value.trim();
    if (!apiKey) throw new Error("请输入 API Key");
    await request(endpoint, apiKey, "/api/v1/bookmarks/page?page=1&pageSize=1&sort=recent");
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
    if (!activeTab?.url || !/^https?:/.test(activeTab.url)) throw new Error("当前页面不能保存");
    const stored = await chrome.storage.local.get(["endpoint", "apiKey"]);
    if (!stored.endpoint || !stored.apiKey) throw new Error("请先配置 API Key");
    await request(stored.endpoint, stored.apiKey, "/api/v1/bookmarks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: activeTab.url,
        title: byId("title").value.trim() || activeTab.title || activeTab.url,
        tags: [],
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
