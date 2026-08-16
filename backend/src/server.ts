import "./config";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createHTTPHandler } from "@trpc/server/adapters/standalone";
import { accountUpdateInput, bookmarkCreateInput, bookmarkPageQuery, bookmarkPatchInput, folderCreateInput, folderUpdateInput, fromPromise, jsonValueSchema, loginInput, tagCreateInput, tagUpdateInput, type JsonValue } from "@loomark/shared";
import { authenticateUser, createSession, getSessionUser, isValidApiToken, updateAccount, verifySession } from "./auth";
import { config, configSource } from "./config";
import { closeDatabase } from "./db";
import { initializeDatabase } from "./database/initialize";
import { appRouter, type BackendContext } from "./router";
import { clickBookmark, createBookmark, createFolder, createTag, getDashboard, listBookmarks, listBookmarksPage, removeBookmark, removeTag, updateBookmark, updateFolder, updateTag } from "./store";

const trpcHandler = createHTTPHandler({
  basePath: "/api/trpc/",
  router: appRouter,
  createContext: ({ req }): BackendContext => ({ apiToken: readApiToken(req), sessionToken: readSessionToken(req) }),
});

function readApiToken(request: IncomingMessage): string | undefined {
  const header = request.headers.authorization;
  return typeof header === "string" ? header.replace(/^Bearer\s+/i, "") : undefined;
}

function readSessionToken(request: IncomingMessage): string | undefined {
  const cookie = request.headers.cookie;
  const token = cookie?.match(/(?:^|;\s*)bookmark_session=([^;]+)/)?.[1];
  console.log("backend session token read", {
    requestId: typeof request.headers["x-request-id"] === "string" ? request.headers["x-request-id"] : "unassigned",
    hasCookie: Boolean(cookie),
    hasToken: Boolean(token),
  });
  return token;
}

async function isAuthorized(request: IncomingMessage): Promise<boolean> {
  if (isValidApiToken(readApiToken(request))) return true;
  return (await verifySession(readSessionToken(request))).ok;
}

function sendJson(response: ServerResponse, status: number, body: JsonValue): void {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

function readBody(request: IncomingMessage): Promise<JsonValue> {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => { body += chunk; });
    request.on("end", () => {
      try {
        const parsed = jsonValueSchema.safeParse(JSON.parse(body));
        if (parsed.success) resolve(parsed.data);
        else reject(new Error("Invalid JSON payload"));
      } catch { reject(new Error("Invalid JSON payload")); }
    });
    request.on("error", reject);
  });
}

async function handleRest(request: IncomingMessage, response: ServerResponse, url: URL): Promise<void> {
  if (request.method === "GET" && url.pathname === "/api/v1/dashboard") {
    if (!(await isAuthorized(request))) { sendJson(response, 401, { error: "Authentication required", code: "UNAUTHORIZED" }); return; }
    sendJson(response, 200, await getDashboard() as JsonValue);
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/v1/bookmarks") {
    if (!(await isAuthorized(request))) { sendJson(response, 401, { error: "Authentication required", code: "UNAUTHORIZED" }); return; }
    sendJson(response, 200, await listBookmarks() as JsonValue);
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/v1/bookmarks/page") {
    if (!(await isAuthorized(request))) { sendJson(response, 401, { error: "Authentication required", code: "UNAUTHORIZED" }); return; }
    const parsedQuery = bookmarkPageQuery.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsedQuery.success) { sendJson(response, 400, { error: "Invalid pagination query" }); return; }
    sendJson(response, 200, await listBookmarksPage(parsedQuery.data) as JsonValue);
    return;
  }
  const clickMatch = url.pathname.match(/^\/api\/v1\/bookmarks\/([^/]+)\/click$/);
  if (request.method === "POST" && clickMatch) {
    if (!(await isAuthorized(request))) { sendJson(response, 401, { error: "Authentication required", code: "UNAUTHORIZED" }); return; }
    const bookmark = await clickBookmark(clickMatch[1]);
    sendJson(response, bookmark ? 200 : 404, bookmark ? bookmark as JsonValue : { error: "Not found" });
    return;
  }
  const bookmarkMatch = url.pathname.match(/^\/api\/v1\/bookmarks\/([^/]+)$/);
  if (request.method === "PATCH" && bookmarkMatch) {
    if (!(await isAuthorized(request))) { sendJson(response, 401, { error: "Authentication required", code: "UNAUTHORIZED" }); return; }
    const bodyResult = await fromPromise(readBody(request), () => ({ code: "INVALID_JSON", message: "Invalid JSON payload" }));
    if (!bodyResult.ok) { sendJson(response, 400, { error: bodyResult.error.message, code: bodyResult.error.code }); return; }
    const parsed = bookmarkPatchInput.safeParse(bodyResult.value);
    if (!parsed.success) { sendJson(response, 400, { error: "书签内容无效", code: "INVALID_BOOKMARK_INPUT" }); return; }
    const bookmark = await updateBookmark(bookmarkMatch[1], parsed.data);
    sendJson(response, bookmark ? 200 : 404, bookmark ? bookmark as JsonValue : { error: "书签不存在", code: "NOT_FOUND" });
    return;
  }
  if (request.method === "DELETE" && bookmarkMatch) {
    if (!(await isAuthorized(request))) { sendJson(response, 401, { error: "Authentication required", code: "UNAUTHORIZED" }); return; }
    const removed = await removeBookmark(bookmarkMatch[1]);
    sendJson(response, removed ? 200 : 404, removed ? { deleted: true } : { error: "书签不存在", code: "NOT_FOUND" });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/v1/bookmarks") {
    if (!(await isAuthorized(request))) { sendJson(response, 401, { error: "Authentication required" }); return; }
    const bodyResult = await fromPromise(readBody(request), () => ({ code: "INVALID_JSON", message: "Invalid JSON payload" }));
    if (!bodyResult.ok) { sendJson(response, 400, { error: bodyResult.error.message, code: bodyResult.error.code }); return; }
    const parsed = bookmarkCreateInput.safeParse(bodyResult.value);
    if (!parsed.success) { sendJson(response, 400, { error: "Invalid URL or JSON payload" }); return; }
    sendJson(response, 201, await createBookmark(parsed.data) as JsonValue);
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/auth/login") {
    const bodyResult = await fromPromise(readBody(request), () => ({ code: "INVALID_JSON", message: "Invalid JSON payload" }));
    if (!bodyResult.ok) { sendJson(response, 400, { error: bodyResult.error.message }); return; }
    const parsed = loginInput.safeParse(bodyResult.value);
    if (!parsed.success) { sendJson(response, 400, { error: "请输入有效邮箱和至少 8 位密码", code: "INVALID_LOGIN_INPUT" }); return; }
    const authenticated = await authenticateUser(parsed.data.email, parsed.data.password);
    if (!authenticated.ok) { sendJson(response, 401, { error: authenticated.error.message, code: authenticated.error.code }); return; }
    const token = await createSession(authenticated.value);
    response.setHeader(
      "set-cookie",
      `bookmark_session=${encodeURIComponent(token)}; Path=/; Max-Age=${60 * 60 * 24 * 7}; HttpOnly; Secure; SameSite=Lax`,
    );
    sendJson(response, 200, { user: authenticated.value, token } as JsonValue);
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/auth/session") {
    const user = await getSessionUser(readSessionToken(request));
    sendJson(response, user.ok ? 200 : 401, user.ok ? { user: user.value } as JsonValue : { error: user.error.message, code: user.error.code });
    return;
  }
  if (request.method === "PATCH" && url.pathname === "/api/v1/account") {
    const bodyResult = await fromPromise(readBody(request), () => ({ code: "INVALID_JSON", message: "Invalid JSON payload" }));
    if (!bodyResult.ok) { sendJson(response, 400, { error: bodyResult.error.message }); return; }
    const parsed = accountUpdateInput.safeParse(bodyResult.value);
    if (!parsed.success) { sendJson(response, 400, { error: "账号设置内容无效", code: "INVALID_ACCOUNT_INPUT" }); return; }
    const result = await updateAccount(readSessionToken(request), parsed.data);
    sendJson(response, result.ok ? 200 : result.error.code === "SESSION_INVALID" ? 401 : result.error.code === "ACCOUNT_NOT_FOUND" ? 404 : 400, result.ok ? { user: result.value } as JsonValue : { error: result.error.message, code: result.error.code });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/v1/folders") {
    if (!(await isAuthorized(request))) { sendJson(response, 401, { error: "Authentication required", code: "UNAUTHORIZED" }); return; }
    const bodyResult = await fromPromise(readBody(request), () => ({ code: "INVALID_JSON", message: "Invalid JSON payload" }));
    if (!bodyResult.ok) { sendJson(response, 400, { error: bodyResult.error.message }); return; }
    const parsed = folderCreateInput.safeParse(bodyResult.value);
    if (!parsed.success) { sendJson(response, 400, { error: "目录内容无效", code: "INVALID_FOLDER_INPUT" }); return; }
    const result = await createFolder(parsed.data);
    sendJson(response, result.ok ? 201 : 409, result.ok ? result.value as JsonValue : { error: result.error.message, code: result.error.code });
    return;
  }
  const folderMatch = url.pathname.match(/^\/api\/v1\/folders\/([^/]+)$/);
  if (request.method === "PATCH" && folderMatch) {
    if (!(await isAuthorized(request))) { sendJson(response, 401, { error: "Authentication required", code: "UNAUTHORIZED" }); return; }
    const bodyResult = await fromPromise(readBody(request), () => ({ code: "INVALID_JSON", message: "Invalid JSON payload" }));
    if (!bodyResult.ok) { sendJson(response, 400, { error: bodyResult.error.message }); return; }
    const parsed = folderUpdateInput.safeParse(bodyResult.value);
    if (!parsed.success) { sendJson(response, 400, { error: "目录内容无效", code: "INVALID_FOLDER_INPUT" }); return; }
    const result = await updateFolder(folderMatch[1], parsed.data);
    sendJson(response, result.ok ? 200 : result.error.code === "NOT_FOUND" ? 404 : 409, result.ok ? result.value as JsonValue : { error: result.error.message, code: result.error.code });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/v1/tags") {
    if (!(await isAuthorized(request))) { sendJson(response, 401, { error: "Authentication required", code: "UNAUTHORIZED" }); return; }
    const bodyResult = await fromPromise(readBody(request), () => ({ code: "INVALID_JSON", message: "Invalid JSON payload" }));
    if (!bodyResult.ok) { sendJson(response, 400, { error: bodyResult.error.message }); return; }
    const parsed = tagCreateInput.safeParse(bodyResult.value);
    if (!parsed.success) { sendJson(response, 400, { error: "标签内容无效", code: "INVALID_TAG_INPUT" }); return; }
    const result = await createTag(parsed.data);
    sendJson(response, result.ok ? 201 : 409, result.ok ? result.value as JsonValue : { error: result.error.message, code: result.error.code });
    return;
  }
  const tagMatch = url.pathname.match(/^\/api\/v1\/tags\/([^/]+)$/);
  if (request.method === "PATCH" && tagMatch) {
    if (!(await isAuthorized(request))) { sendJson(response, 401, { error: "Authentication required", code: "UNAUTHORIZED" }); return; }
    const bodyResult = await fromPromise(readBody(request), () => ({ code: "INVALID_JSON", message: "Invalid JSON payload" }));
    if (!bodyResult.ok) { sendJson(response, 400, { error: bodyResult.error.message }); return; }
    const parsed = tagUpdateInput.safeParse(bodyResult.value);
    if (!parsed.success) { sendJson(response, 400, { error: "标签内容无效", code: "INVALID_TAG_INPUT" }); return; }
    const result = await updateTag(tagMatch[1], parsed.data);
    sendJson(response, result.ok ? 200 : result.error.code === "NOT_FOUND" ? 404 : 409, result.ok ? result.value as JsonValue : { error: result.error.message, code: result.error.code });
    return;
  }
  if (request.method === "DELETE" && tagMatch) {
    if (!(await isAuthorized(request))) { sendJson(response, 401, { error: "Authentication required", code: "UNAUTHORIZED" }); return; }
    const result = await removeTag(tagMatch[1]);
    sendJson(response, result.ok ? 200 : 404, result.ok ? result.value as JsonValue : { error: result.error.message, code: result.error.code });
    return;
  }
  sendJson(response, 404, { error: "Not found" });
}

const server = createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  if (url.pathname.startsWith("/api/trpc")) { trpcHandler(request, response); return; }
  handleRest(request, response, url).catch((_error: Error) => {
    console.error("backend request failed", {
      requestId: typeof request.headers["x-request-id"] === "string" ? request.headers["x-request-id"] : "unassigned",
      userId: "anonymous",
      code: "INTERNAL_SERVER_ERROR",
    });
    sendJson(response, 500, { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" });
  });
});

initializeDatabase()
  .then(() => server.listen(config.PORT, () => console.log(`Loomark backend listening on http://localhost:${config.PORT}`, { configSource })))
  .catch((error: Error) => {
    console.error("backend database initialization failed", {
      code: "DATABASE_INITIALIZATION_FAILED",
      message: error.message,
      database: config.MONGODB_DB,
    });
    process.exitCode = 1;
  });

process.once("SIGTERM", () => { void closeDatabase(); });
process.once("SIGINT", () => { void closeDatabase(); });
