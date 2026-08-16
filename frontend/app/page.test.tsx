import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import type { BookmarkResponse, DashboardData, JsonValue, UserResponse } from "@loomark/shared";
import Home from "./page";
import { ThemeProvider } from "./theme-provider";

const account: UserResponse = { id: "test-user", email: "test@bookmark-nav.local", name: "测试账号", createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" };
const alpha: BookmarkResponse = { id: "alpha", title: "Alpha 书签", url: "https://alpha.example", description: "第一页内容", domain: "alpha.example", favicon: "https://alpha.example/favicon.ico", folderId: "dev", tags: ["frontend"], clicks: 10, createdAt: "2025-01-02T00:00:00.000Z", isPublic: false };
const beta: BookmarkResponse = { ...alpha, id: "beta", title: "Beta 书签", url: "https://beta.example", domain: "beta.example", favicon: "https://beta.example/favicon.ico", description: "第二页内容", createdAt: "2025-01-01T00:00:00.000Z" };
const dashboard: DashboardData = {
  bookmarks: [alpha, beta],
  folders: [{ id: "all", name: "全部书签", icon: "◈", count: 2, createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" }, { id: "dev", name: "开发工具", icon: "⌘", count: 2, createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" }],
  tags: [{ id: "frontend", name: "前端", color: "#3b82f6", count: 2, createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" }],
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
    await user.click(screen.getAllByRole("button", { name: "编辑前端" })[1]);
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
});
