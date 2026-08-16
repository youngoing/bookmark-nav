import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import type { BookmarkResponse, DashboardData, JsonValue, UserResponse } from "@loomark/shared";
import Home from "./page";
import { ThemeProvider } from "./theme-provider";

const account: UserResponse = { id: "test-user", email: "test@bookmark-nav.local", name: "测试账号", createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" };
const alpha: BookmarkResponse = { id: "alpha", ownerId: account.id, siteId: "site-alpha", title: "Alpha 书签", url: "https://alpha.example", description: "第一页内容", domain: "alpha.example", favicon: "https://alpha.example/favicon.ico", folderId: "dev", tags: ["frontend"], clicks: 10, isFavorite: false, publicationId: null, createdAt: "2025-01-02T00:00:00.000Z", updatedAt: "2025-01-02T00:00:00.000Z" };
const beta: BookmarkResponse = { ...alpha, id: "beta", siteId: "site-beta", title: "Beta 书签", url: "https://beta.example", domain: "beta.example", favicon: "https://beta.example/favicon.ico", description: "第二页内容", createdAt: "2025-01-01T00:00:00.000Z" };
const dashboard: DashboardData = {
  bookmarks: [alpha, beta],
  folders: [{ id: "all", ownerId: account.id, name: "全部书签", icon: "◈", count: 2, createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" }, { id: "dev", ownerId: account.id, name: "开发工具", icon: "⌘", count: 2, createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" }],
  tags: [{ id: "frontend", ownerId: account.id, name: "前端", color: "#3b82f6", parentId: null, collectionId: null, count: 2, createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" }],
  sites: [{ id: "site-alpha", ownerId: account.id, domain: "alpha.example", name: "Alpha", homepageUrl: "https://alpha.example", favicon: "https://alpha.example/favicon.ico", folderId: "dev", tags: ["frontend"], count: 1, createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z" }, { id: "site-beta", ownerId: account.id, domain: "beta.example", name: "Beta", homepageUrl: "https://beta.example", favicon: "https://beta.example/favicon.ico", folderId: null, tags: [], count: 1, createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z" }],
  totalClicks: 20,
};

function json(body: JsonValue, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }); }
function requestUrl(input: RequestInfo | URL): URL { return new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, "http://localhost"); }

afterEach(() => { vi.unstubAllGlobals(); window.localStorage.clear(); });

describe("书签工作台用户流程", () => {
  it("已登录用户可以切换三种展示方式并前后翻页", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
      const url = requestUrl(input);
      if (url.pathname === "/api/auth/session") return json({ user: account });
      if (url.pathname === "/api/v1/dashboard") return json(dashboard);
      if (url.pathname === "/api/v1/bookmarks/page") {
        const page = url.searchParams.get("page") === "2" ? 2 : 1;
        return json({ items: [page === 2 ? beta : alpha], page, pageSize: 9, total: 10, totalPages: 2 });
      }
      return json({ error: "Not found" }, 404);
    }));
    const user = userEvent.setup();
    render(createElement(ThemeProvider, { children: createElement(Home) }));

    expect(await screen.findByText("Alpha 书签")).toBeTruthy();
    expect(screen.getByRole("list", { name: "大图书签" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "列表展示" }));
    expect(screen.getByRole("list", { name: "列表书签" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "表格展示" }));
    expect(screen.getByRole("table")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "下一页" }));
    expect(await screen.findByText("Beta 书签")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "上一页" }));
    expect(await screen.findByText("Alpha 书签")).toBeTruthy();
  });

  it("未登录用户使用初始化测试账号后进入工作台", async () => {
    let loggedIn = false;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
      const url = requestUrl(input);
      if (url.pathname === "/api/auth/session") return loggedIn ? json({ user: account }) : json({ error: "Authentication required" }, 401);
      if (url.pathname === "/api/auth/login") { loggedIn = true; return json({ user: account }); }
      if (url.pathname === "/api/v1/dashboard") return json(dashboard);
      if (url.pathname === "/api/v1/bookmarks/page") return json({ items: [alpha], page: 1, pageSize: 9, total: 1, totalPages: 1 });
      return json({ error: "Not found" }, 404);
    }));
    const user = userEvent.setup();
    render(createElement(ThemeProvider, { children: createElement(Home) }));

    expect(await screen.findByRole("heading", { name: "登录" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Google 登录" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("link", { name: "使用 Google 登录" })).toBeTruthy();
    const passwordTab = screen.getByRole("tab", { name: "账号密码登录" });
    await user.click(passwordTab);
    expect(passwordTab.getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByRole("link", { name: "使用 Google 登录" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Demo 尝试" }));
    expect((screen.getByLabelText("邮箱") as HTMLInputElement).value).toBe("test@bookmark-nav.local");
    expect((screen.getByLabelText("密码") as HTMLInputElement).value).toBe("Test123456!");
    await user.click(screen.getByRole("button", { name: "登录" }));
    expect(await screen.findByText("Alpha 书签")).toBeTruthy();
    expect(screen.getByText("bookmark-nav")).toBeTruthy();
    expect(screen.queryByText("测试账号")).toBeNull();
  });

  it("用户编辑标签后在导航中看到更新后的名称", async () => {
    let tagName = "前端";
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
      const url = requestUrl(input);
      if (url.pathname === "/api/auth/session") return json({ user: account });
      if (url.pathname === "/api/v1/dashboard") return json({ ...dashboard, tags: [{ ...dashboard.tags[0], name: tagName }] });
      if (url.pathname === "/api/v1/bookmarks/page") return json({ items: [alpha], page: 1, pageSize: 9, total: 1, totalPages: 1 });
      if (url.pathname === "/api/v1/tags/frontend") {
        tagName = "界面开发";
        return json({ ...dashboard.tags[0], name: tagName });
      }
      return json({ error: "Not found" }, 404);
    }));
    const user = userEvent.setup();
    render(createElement(ThemeProvider, { children: createElement(Home) }));

    expect(await screen.findByRole("button", { name: "编辑标签" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "编辑标签" }));
    await user.click(screen.getByRole("button", { name: "编辑前端" }));
    expect(screen.getByRole("heading", { name: "编辑标签" })).toBeTruthy();
    const nameInput = screen.getByLabelText("名称");
    await user.clear(nameInput);
    await user.type(nameInput, "界面开发");
    await user.click(screen.getByRole("button", { name: "保存标签" }));
    expect((await screen.findAllByText("界面开发")).length).toBeGreaterThan(0);
  });

  it("用户点击书签后访问频次立即增加 1", async () => {
    let clicked = false;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
      const url = requestUrl(input);
      if (url.pathname === "/api/auth/session") return json({ user: account });
      if (url.pathname === "/api/v1/dashboard") return json({ ...dashboard, bookmarks: [{ ...alpha, clicks: clicked ? 11 : 10 }, beta], totalClicks: clicked ? 21 : 20 });
      if (url.pathname === "/api/v1/bookmarks/page") return json({ items: [{ ...alpha, clicks: clicked ? 11 : 10 }], page: 1, pageSize: 9, total: 1, totalPages: 1 });
      if (url.pathname === "/api/v1/bookmarks/alpha/click") {
        clicked = true;
        return json({ ...alpha, clicks: 11 });
      }
      return json({ error: "Not found" }, 404);
    }));
    const user = userEvent.setup();
    render(createElement(ThemeProvider, { children: createElement(Home) }));

    expect(await screen.findByText("10")).toBeTruthy();
    await user.click(screen.getByRole("link", { name: /Alpha 书签/ }));
    expect(await screen.findByText("11")).toBeTruthy();
  });

  it("用户可以让当前页面所有书签进入行内编辑模式", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
      const url = requestUrl(input);
      if (url.pathname === "/api/auth/session") return json({ user: account });
      if (url.pathname === "/api/v1/dashboard") return json(dashboard);
      if (url.pathname === "/api/v1/bookmarks/page") return json({ items: [alpha], page: 1, pageSize: 9, total: 1, totalPages: 1 });
      if (url.pathname === "/api/v1/tags/frontend") return json(dashboard.tags[0]);
      return json({ error: "Not found" }, 404);
    }));
    const user = userEvent.setup();
    render(createElement(ThemeProvider, { children: createElement(Home) }));

    await user.click(await screen.findByRole("button", { name: "编辑书签" }));
    expect(screen.getByRole("group", { name: "当前页面书签编辑模式" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "编辑Alpha 书签" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "删除Alpha 书签" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "编辑Alpha 书签" }));
    expect(screen.getByRole("heading", { name: "编辑书签" })).toBeTruthy();
  });

  it("个人书签与其他用户的分享在不同栏目展示", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
      const url = requestUrl(input);
      if (url.pathname === "/api/auth/session") return json({ user: account });
      if (url.pathname === "/api/v1/dashboard") return json(dashboard);
      if (url.pathname === "/api/v1/bookmarks/page") return json({ items: [alpha], page: 1, pageSize: 9, total: 1, totalPages: 1 });
      if (url.pathname === "/api/v1/discover") return json([{ id: "shared-1", sourceBookmarkId: "other-bookmark", author: { id: "other-user", name: "其他用户" }, url: "https://shared.example", title: "共享资料", description: "来自发现栏目", domain: "shared.example", favicon: "https://shared.example/favicon.ico", publishedAt: "2025-01-03T00:00:00.000Z" }]);
      if (url.pathname === "/api/v1/discover/collections") return json([]);
      if (url.pathname === "/api/v1/discover/shared-1/save") return json({ ...alpha, id: "saved-copy", title: "共享资料", url: "https://shared.example" }, 201);
      return json({ error: "Not found" }, 404);
    }));
    const user = userEvent.setup();
    render(createElement(ThemeProvider, { children: createElement(Home) }));

    expect(await screen.findByText("Alpha 书签")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "发现" }));
    await user.click(await screen.findByRole("tab", { name: "单条分享" }));
    expect(await screen.findByText("共享资料")).toBeTruthy();
    expect(screen.queryByText("Alpha 书签")).toBeNull();
    await user.click(screen.getByRole("button", { name: "保存到我的书签" }));
    expect((await screen.findByRole("button", { name: "已保存" })).hasAttribute("disabled")).toBe(true);
  });

  it("发现页默认展示共享合集并可保存整个合集", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
      const url = requestUrl(input);
      if (url.pathname === "/api/auth/session") return json({ user: account });
      if (url.pathname === "/api/v1/dashboard") return json(dashboard);
      if (url.pathname === "/api/v1/bookmarks/page") return json({ items: [alpha], page: 1, pageSize: 9, total: 1, totalPages: 1 });
      if (url.pathname === "/api/v1/discover") return json([]);
      if (url.pathname === "/api/v1/discover/collections") return json([{ id: "collection-1", ownerId: "other-user", sourceTagId: "tag-1", author: { id: "other-user", name: "其他用户" }, name: "前端精选", description: "实用资料", items: [{ id: "item-1", sourceBookmarkId: "source-1", url: "https://shared.example", title: "共享资料", description: "", domain: "shared.example", favicon: "https://shared.example/favicon.ico", sortOrder: 0 }], publishedAt: "2025-01-03T00:00:00.000Z", updatedAt: "2025-01-03T00:00:00.000Z" }]);
      if (url.pathname === "/api/v1/shared-collections/collection-1/save") return json({ savedCount: 1, tag: dashboard.tags[0] }, 201);
      return json({ error: "Not found" }, 404);
    }));
    const user = userEvent.setup();
    render(createElement(ThemeProvider, { children: createElement(Home) }));

    await screen.findByText("Alpha 书签");
    await user.click(screen.getByRole("button", { name: "发现" }));
    expect(await screen.findByText("前端精选")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "保存整个合集" }));
    expect((await screen.findByRole("button", { name: "已保存" })).hasAttribute("disabled")).toBe(true);
  });

  it("网站栏目按 Site 父级展示并可添加子链接", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
      const url = requestUrl(input);
      if (url.pathname === "/api/auth/session") return json({ user: account });
      if (url.pathname === "/api/v1/dashboard") return json(dashboard);
      if (url.pathname === "/api/v1/bookmarks/page") return json({ items: [alpha], page: 1, pageSize: 9, total: 1, totalPages: 1 });
      return json({ error: "Not found" }, 404);
    }));
    const user = userEvent.setup();
    render(createElement(ThemeProvider, { children: createElement(Home) }));

    await screen.findByText("Alpha 书签");
    await user.click(screen.getByRole("button", { name: "网站2" }));
    expect(screen.getByRole("button", { name: "编辑Alpha" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "为Alpha添加子链接" }));
    expect(screen.getByRole("heading", { name: "添加网站子链接" })).toBeTruthy();
    expect((screen.getByLabelText("所属网站") as HTMLSelectElement).value).toBe("site-alpha");
  });

  it("用户可以为浏览器扩展创建 API Key 并下载扩展", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = requestUrl(input);
      if (url.pathname === "/api/auth/session") return json({ user: account });
      if (url.pathname === "/api/v1/dashboard") return json(dashboard);
      if (url.pathname === "/api/v1/bookmarks/page") return json({ items: [alpha], page: 1, pageSize: 9, total: 1, totalPages: 1 });
      if (url.pathname === "/api/v1/api-keys" && init?.method === "POST") return json({ id: "key-1", name: "Chrome 扩展", prefix: "bmn_example...", key: "bmn_example_secret", createdAt: "2026-08-16T00:00:00.000Z", lastUsedAt: null }, 201);
      if (url.pathname === "/api/v1/api-keys") return json([]);
      return json({ error: "Not found" }, 404);
    }));
    const user = userEvent.setup();
    render(createElement(ThemeProvider, { children: createElement(Home) }));

    await screen.findByText("Alpha 书签");
    await user.click(screen.getByRole("button", { name: "测" }));
    await user.click(screen.getByRole("button", { name: "账号设置" }));
    await user.click(screen.getByRole("tab", { name: "浏览器扩展" }));
    expect(screen.getByRole("link", { name: "下载扩展" }).getAttribute("href")).toBe("/downloads/bookmark-nav-extension.zip");
    await user.click(screen.getByRole("button", { name: "创建" }));
    expect(await screen.findByText("bmn_example_secret")).toBeTruthy();
    expect(screen.getByRole("button", { name: "撤销Chrome 扩展" })).toBeTruthy();
  });
});
