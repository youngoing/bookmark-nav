import "./config";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { createHTTPHandler } from "@trpc/server/adapters/standalone";
import {
  accountUpdateInput,
  apiKeyCreateInput,
  bookmarkCreateInput,
  bookmarkPageQuery,
  bookmarkPatchInput,
  folderCreateInput,
  folderUpdateInput,
  fromPromise,
  jsonValueSchema,
  loginInput,
  siteCreateInput,
  siteUpdateInput,
  sharedCollectionPublishInput,
  tagCreateInput,
  tagUpdateInput,
  type JsonValue,
  type UserResponse,
} from "@loomark/shared";
import {
  authenticateGoogle,
  authenticateUser,
  createApiKey,
  createSession,
  getApiKeyUser,
  getSessionUser,
  listApiKeys,
  revokeApiKey,
  updateAccount,
} from "./auth";
import { config, configSource } from "./config";
import { closeDatabase } from "./db";
import { initializeDatabase } from "./database/initialize";
import { appRouter, type BackendContext } from "./router";
import {
  clickBookmark,
  createBookmark,
  createFolder,
  createSite,
  createTag,
  getDashboard,
  listTagOptions,
  listBookmarks,
  listBookmarksPage,
  listDiscover,
  listSharedCollections,
  publishBookmark,
  publishTagCollection,
  removeBookmark,
  removeFolder,
  removeSite,
  removeTag,
  savePublication,
  saveSharedCollection,
  unpublishBookmark,
  unpublishTagCollection,
  updateBookmark,
  updateFolder,
  updateSite,
  updateTag,
} from "./store";

function readSessionToken(request: IncomingMessage): string | undefined {
  return request.headers.cookie?.match(
    /(?:^|;\s*)bookmark_session=([^;]+)/,
  )?.[1];
}

function readBearerToken(request: IncomingMessage): string | undefined {
  const authorization = request.headers.authorization;
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim();
}

const trpcHandler = createHTTPHandler({
  basePath: "/api/trpc/",
  router: appRouter,
  createContext: ({ req }): BackendContext => ({
    sessionToken: readSessionToken(req),
  }),
});

function sendJson(
  response: ServerResponse,
  status: number,
  body: JsonValue,
): void {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

async function requireUser(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<UserResponse | null> {
  const sessionToken = readSessionToken(request);
  const result = sessionToken
    ? await getSessionUser(sessionToken)
    : await getApiKeyUser(readBearerToken(request));
  if (result.ok) return result.value;
  sendJson(response, 401, {
    error: result.error.message,
    code: result.error.code,
  });
  return null;
}

async function requireSessionUser(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<UserResponse | null> {
  const result = await getSessionUser(readSessionToken(request));
  if (result.ok) return result.value;
  sendJson(response, 401, {
    error: result.error.message,
    code: result.error.code,
  });
  return null;
}

function readBody(request: IncomingMessage): Promise<JsonValue> {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        const parsed = jsonValueSchema.safeParse(JSON.parse(body));
        if (parsed.success) resolve(parsed.data);
        else reject(new Error("Invalid JSON payload"));
      } catch {
        reject(new Error("Invalid JSON payload"));
      }
    });
    request.on("error", reject);
  });
}

async function handleRest(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
): Promise<void> {
  if (request.method === "POST" && url.pathname === "/api/auth/login") {
    const bodyResult = await fromPromise(readBody(request), () => ({
      code: "INVALID_JSON",
      message: "Invalid JSON payload",
    }));
    if (!bodyResult.ok) {
      sendJson(response, 400, { error: bodyResult.error.message });
      return;
    }
    const parsed = loginInput.safeParse(bodyResult.value);
    if (!parsed.success) {
      sendJson(response, 400, {
        error: "请输入有效邮箱和至少 8 位密码",
        code: "INVALID_LOGIN_INPUT",
      });
      return;
    }
    const authenticated = await authenticateUser(
      parsed.data.email,
      parsed.data.password,
    );
    if (!authenticated.ok) {
      sendJson(response, 401, {
        error: authenticated.error.message,
        code: authenticated.error.code,
      });
      return;
    }
    const token = await createSession(authenticated.value);
    response.setHeader(
      "set-cookie",
      `bookmark_session=${encodeURIComponent(token)}; Path=/; Max-Age=${60 * 60 * 24 * 7}; HttpOnly; Secure; SameSite=Lax`,
    );
    sendJson(response, 200, { user: authenticated.value, token } as JsonValue);
    return;
  }

  if (
    request.method === "POST" &&
    url.pathname === "/api/auth/google/callback"
  ) {
    const bodyResult = await fromPromise(readBody(request), () => ({
      code: "INVALID_JSON",
      message: "Invalid JSON payload",
    }));
    if (
      !bodyResult.ok ||
      typeof bodyResult.value !== "object" ||
      bodyResult.value === null ||
      Array.isArray(bodyResult.value) ||
      !("code" in bodyResult.value) ||
      typeof bodyResult.value.code !== "string" ||
      !bodyResult.value.code
    ) {
      sendJson(response, 400, {
        error: "Google 授权码无效",
        code: "INVALID_GOOGLE_CODE",
      });
      return;
    }
    const authenticated = await authenticateGoogle(bodyResult.value.code);
    if (!authenticated.ok) {
      const status =
        authenticated.error.code === "GOOGLE_NOT_CONFIGURED"
          ? 503
          : authenticated.error.code === "ACCOUNT_CREATION_FAILED"
            ? 500
            : 401;
      sendJson(response, status, {
        error: authenticated.error.message,
        code: authenticated.error.code,
      });
      return;
    }
    response.setHeader(
      "set-cookie",
      `bookmark_session=${encodeURIComponent(authenticated.value.token)}; Path=/; Max-Age=${60 * 60 * 24 * 7}; HttpOnly; Secure; SameSite=Lax`,
    );
    sendJson(response, 200, {
      user: authenticated.value.user,
      token: authenticated.value.token,
    } as JsonValue);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/auth/session") {
    const user = await getSessionUser(readSessionToken(request));
    sendJson(
      response,
      user.ok ? 200 : 401,
      user.ok
        ? ({ user: user.value } as JsonValue)
        : { error: user.error.message, code: user.error.code },
    );
    return;
  }

  if (request.method === "PATCH" && url.pathname === "/api/v1/account") {
    const bodyResult = await fromPromise(readBody(request), () => ({
      code: "INVALID_JSON",
      message: "Invalid JSON payload",
    }));
    if (!bodyResult.ok) {
      sendJson(response, 400, { error: bodyResult.error.message });
      return;
    }
    const parsed = accountUpdateInput.safeParse(bodyResult.value);
    if (!parsed.success) {
      sendJson(response, 400, {
        error: "账号设置内容无效",
        code: "INVALID_ACCOUNT_INPUT",
      });
      return;
    }
    const result = await updateAccount(readSessionToken(request), parsed.data);
    sendJson(
      response,
      result.ok
        ? 200
        : result.error.code === "SESSION_INVALID"
          ? 401
        : result.error.code === "ACCOUNT_NOT_FOUND"
          ? 404
          : result.error.code === "DEMO_ACCOUNT_READ_ONLY"
            ? 403
          : 400,
      result.ok
        ? ({ user: result.value } as JsonValue)
        : { error: result.error.message, code: result.error.code },
    );
    return;
  }

  if (url.pathname === "/api/v1/api-keys") {
    const sessionUser = await requireSessionUser(request, response);
    if (!sessionUser) return;
    if (request.method === "GET") {
      sendJson(response, 200, (await listApiKeys(sessionUser.id)) as JsonValue);
      return;
    }
    if (request.method === "POST") {
      const bodyResult = await fromPromise(readBody(request), () => ({
        code: "INVALID_JSON",
        message: "Invalid JSON payload",
      }));
      if (!bodyResult.ok) {
        sendJson(response, 400, { error: bodyResult.error.message });
        return;
      }
      const parsed = apiKeyCreateInput.safeParse(bodyResult.value);
      if (!parsed.success) {
        sendJson(response, 400, {
          error: "API Key 名称无效",
          code: "INVALID_API_KEY_INPUT",
        });
        return;
      }
      sendJson(
        response,
        201,
        (await createApiKey(sessionUser.id, parsed.data.name)) as JsonValue,
      );
      return;
    }
  }
  const apiKeyMatch = url.pathname.match(/^\/api\/v1\/api-keys\/([^/]+)$/);
  if (request.method === "DELETE" && apiKeyMatch) {
    const sessionUser = await requireSessionUser(request, response);
    if (!sessionUser) return;
    const revoked = await revokeApiKey(sessionUser.id, apiKeyMatch[1]);
    sendJson(
      response,
      revoked ? 200 : 404,
      revoked ? { revoked: true } : { error: "API Key 不存在", code: "NOT_FOUND" },
    );
    return;
  }

  const user = await requireUser(request, response);
  if (!user) return;

  if (request.method === "GET" && url.pathname === "/api/v1/dashboard") {
    sendJson(response, 200, (await getDashboard(user.id)) as JsonValue);
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/v1/bookmarks") {
    sendJson(response, 200, (await listBookmarks(user.id)) as JsonValue);
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/v1/bookmarks/page") {
    const parsedQuery = bookmarkPageQuery.safeParse(
      Object.fromEntries(url.searchParams.entries()),
    );
    if (!parsedQuery.success) {
      sendJson(response, 400, { error: "Invalid pagination query" });
      return;
    }
    sendJson(
      response,
      200,
      (await listBookmarksPage(user.id, parsedQuery.data)) as JsonValue,
    );
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/v1/bookmarks") {
    const bodyResult = await fromPromise(readBody(request), () => ({
      code: "INVALID_JSON",
      message: "Invalid JSON payload",
    }));
    if (!bodyResult.ok) {
      sendJson(response, 400, {
        error: bodyResult.error.message,
        code: bodyResult.error.code,
      });
      return;
    }
    const parsed = bookmarkCreateInput.safeParse(bodyResult.value);
    if (!parsed.success) {
      sendJson(response, 400, {
        error: "书签内容无效",
        code: "INVALID_BOOKMARK_INPUT",
      });
      return;
    }
    const result = await createBookmark(user.id, parsed.data);
    sendJson(
      response,
      result.ok ? 201 : 400,
      result.ok
        ? (result.value as JsonValue)
        : { error: result.error.message, code: result.error.code },
    );
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/v1/discover") {
    sendJson(response, 200, (await listDiscover(user.id)) as JsonValue);
    return;
  }
  if (
    request.method === "GET" &&
    url.pathname === "/api/v1/discover/collections"
  ) {
    sendJson(
      response,
      200,
      (await listSharedCollections(user.id)) as JsonValue,
    );
    return;
  }

  const savePublicationMatch = url.pathname.match(
    /^\/api\/v1\/discover\/([^/]+)\/save$/,
  );
  if (request.method === "POST" && savePublicationMatch) {
    const result = await savePublication(user.id, savePublicationMatch[1]);
    sendJson(
      response,
      result.ok ? 201 : 404,
      result.ok
        ? (result.value as JsonValue)
        : { error: result.error.message, code: result.error.code },
    );
    return;
  }
  const saveCollectionMatch = url.pathname.match(
    /^\/api\/v1\/shared-collections\/([^/]+)\/save$/,
  );
  if (request.method === "POST" && saveCollectionMatch) {
    const result = await saveSharedCollection(user.id, saveCollectionMatch[1]);
    sendJson(
      response,
      result.ok ? 201 : 404,
      result.ok
        ? (result.value as JsonValue)
        : { error: result.error.message, code: result.error.code },
    );
    return;
  }
  const collectionMatch = url.pathname.match(
    /^\/api\/v1\/shared-collections\/([^/]+)$/,
  );
  if (request.method === "DELETE" && collectionMatch) {
    const removed = await unpublishTagCollection(user.id, collectionMatch[1]);
    sendJson(
      response,
      removed ? 200 : 404,
      removed
        ? { unpublished: true }
        : { error: "共享合集不存在", code: "NOT_FOUND" },
    );
    return;
  }

  const shareMatch = url.pathname.match(
    /^\/api\/v1\/bookmarks\/([^/]+)\/share$/,
  );
  if (request.method === "POST" && shareMatch) {
    const result = await publishBookmark(user.id, user.name, shareMatch[1]);
    sendJson(
      response,
      result.ok ? 201 : 404,
      result.ok
        ? (result.value as JsonValue)
        : { error: result.error.message, code: result.error.code },
    );
    return;
  }
  if (request.method === "DELETE" && shareMatch) {
    const removed = await unpublishBookmark(user.id, shareMatch[1]);
    sendJson(
      response,
      removed ? 200 : 404,
      removed
        ? { unpublished: true }
        : { error: "分享不存在", code: "NOT_FOUND" },
    );
    return;
  }

  const clickMatch = url.pathname.match(
    /^\/api\/v1\/bookmarks\/([^/]+)\/click$/,
  );
  if (request.method === "POST" && clickMatch) {
    const bookmark = await clickBookmark(user.id, clickMatch[1]);
    sendJson(
      response,
      bookmark ? 200 : 404,
      bookmark ? (bookmark as JsonValue) : { error: "Not found" },
    );
    return;
  }

  const bookmarkMatch = url.pathname.match(/^\/api\/v1\/bookmarks\/([^/]+)$/);
  if (request.method === "PATCH" && bookmarkMatch) {
    const bodyResult = await fromPromise(readBody(request), () => ({
      code: "INVALID_JSON",
      message: "Invalid JSON payload",
    }));
    if (!bodyResult.ok) {
      sendJson(response, 400, {
        error: bodyResult.error.message,
        code: bodyResult.error.code,
      });
      return;
    }
    const parsed = bookmarkPatchInput.safeParse(bodyResult.value);
    if (!parsed.success) {
      sendJson(response, 400, {
        error: "书签内容无效",
        code: "INVALID_BOOKMARK_INPUT",
      });
      return;
    }
    const result = await updateBookmark(user.id, bookmarkMatch[1], parsed.data);
    sendJson(
      response,
      result.ok ? 200 : result.error.code === "NOT_FOUND" ? 404 : 400,
      result.ok
        ? (result.value as JsonValue)
        : { error: result.error.message, code: result.error.code },
    );
    return;
  }
  if (request.method === "DELETE" && bookmarkMatch) {
    const removed = await removeBookmark(user.id, bookmarkMatch[1]);
    sendJson(
      response,
      removed ? 200 : 404,
      removed ? { deleted: true } : { error: "书签不存在", code: "NOT_FOUND" },
    );
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/v1/sites") {
    const bodyResult = await fromPromise(readBody(request), () => ({
      code: "INVALID_JSON",
      message: "Invalid JSON payload",
    }));
    if (!bodyResult.ok) {
      sendJson(response, 400, { error: bodyResult.error.message });
      return;
    }
    const parsed = siteCreateInput.safeParse(bodyResult.value);
    if (!parsed.success) {
      sendJson(response, 400, {
        error: "网站内容无效",
        code: "INVALID_SITE_INPUT",
      });
      return;
    }
    const result = await createSite(user.id, parsed.data);
    sendJson(
      response,
      result.ok ? 201 : result.error.code === "INVALID_REFERENCE" ? 400 : 409,
      result.ok
        ? (result.value as JsonValue)
        : { error: result.error.message, code: result.error.code },
    );
    return;
  }
  const siteMatch = url.pathname.match(/^\/api\/v1\/sites\/([^/]+)$/);
  if (request.method === "PATCH" && siteMatch) {
    const bodyResult = await fromPromise(readBody(request), () => ({
      code: "INVALID_JSON",
      message: "Invalid JSON payload",
    }));
    if (!bodyResult.ok) {
      sendJson(response, 400, { error: bodyResult.error.message });
      return;
    }
    const parsed = siteUpdateInput.safeParse(bodyResult.value);
    if (!parsed.success) {
      sendJson(response, 400, {
        error: "网站内容无效",
        code: "INVALID_SITE_INPUT",
      });
      return;
    }
    const result = await updateSite(user.id, siteMatch[1], parsed.data);
    sendJson(
      response,
      result.ok
        ? 200
        : result.error.code === "NOT_FOUND"
          ? 404
          : result.error.code === "INVALID_REFERENCE"
            ? 400
            : 409,
      result.ok
        ? (result.value as JsonValue)
        : { error: result.error.message, code: result.error.code },
    );
    return;
  }
  if (request.method === "DELETE" && siteMatch) {
    const result = await removeSite(user.id, siteMatch[1]);
    sendJson(
      response,
      result.ok ? 200 : result.error.code === "SITE_NOT_EMPTY" ? 409 : 404,
      result.ok
        ? (result.value as JsonValue)
        : { error: result.error.message, code: result.error.code },
    );
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/v1/folders") {
    const bodyResult = await fromPromise(readBody(request), () => ({
      code: "INVALID_JSON",
      message: "Invalid JSON payload",
    }));
    if (!bodyResult.ok) {
      sendJson(response, 400, { error: bodyResult.error.message });
      return;
    }
    const parsed = folderCreateInput.safeParse(bodyResult.value);
    if (!parsed.success) {
      sendJson(response, 400, {
        error: "目录内容无效",
        code: "INVALID_FOLDER_INPUT",
      });
      return;
    }
    const result = await createFolder(user.id, parsed.data);
    sendJson(
      response,
      result.ok ? 201 : 409,
      result.ok
        ? (result.value as JsonValue)
        : { error: result.error.message, code: result.error.code },
    );
    return;
  }
  const folderMatch = url.pathname.match(/^\/api\/v1\/folders\/([^/]+)$/);
  if (request.method === "PATCH" && folderMatch) {
    const bodyResult = await fromPromise(readBody(request), () => ({
      code: "INVALID_JSON",
      message: "Invalid JSON payload",
    }));
    if (!bodyResult.ok) {
      sendJson(response, 400, { error: bodyResult.error.message });
      return;
    }
    const parsed = folderUpdateInput.safeParse(bodyResult.value);
    if (!parsed.success) {
      sendJson(response, 400, {
        error: "目录内容无效",
        code: "INVALID_FOLDER_INPUT",
      });
      return;
    }
    const result = await updateFolder(user.id, folderMatch[1], parsed.data);
    sendJson(
      response,
      result.ok ? 200 : result.error.code === "NOT_FOUND" ? 404 : 409,
      result.ok
        ? (result.value as JsonValue)
        : { error: result.error.message, code: result.error.code },
    );
    return;
  }
  if (request.method === "DELETE" && folderMatch) {
    const result = await removeFolder(user.id, folderMatch[1]);
    sendJson(
      response,
      result.ok ? 200 : result.error.code === "FOLDER_NOT_EMPTY" ? 409 : 404,
      result.ok
        ? (result.value as JsonValue)
        : { error: result.error.message, code: result.error.code },
    );
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/v1/tags") {
    sendJson(response, 200, (await listTagOptions(user.id)) as JsonValue);
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/v1/tags") {
    const bodyResult = await fromPromise(readBody(request), () => ({
      code: "INVALID_JSON",
      message: "Invalid JSON payload",
    }));
    if (!bodyResult.ok) {
      sendJson(response, 400, { error: bodyResult.error.message });
      return;
    }
    const parsed = tagCreateInput.safeParse(bodyResult.value);
    if (!parsed.success) {
      sendJson(response, 400, {
        error: "标签内容无效",
        code: "INVALID_TAG_INPUT",
      });
      return;
    }
    const result = await createTag(user.id, parsed.data);
    sendJson(
      response,
      result.ok ? 201 : 409,
      result.ok
        ? (result.value as JsonValue)
        : { error: result.error.message, code: result.error.code },
    );
    return;
  }
  const publishTagMatch = url.pathname.match(
    /^\/api\/v1\/tags\/([^/]+)\/publish$/,
  );
  if (request.method === "POST" && publishTagMatch) {
    const bodyResult = await fromPromise(readBody(request), () => ({
      code: "INVALID_JSON",
      message: "Invalid JSON payload",
    }));
    if (!bodyResult.ok) {
      sendJson(response, 400, { error: bodyResult.error.message });
      return;
    }
    const parsed = sharedCollectionPublishInput.safeParse(bodyResult.value);
    if (!parsed.success) {
      sendJson(response, 400, {
        error: "共享合集内容无效",
        code: "INVALID_COLLECTION_INPUT",
      });
      return;
    }
    const result = await publishTagCollection(
      user.id,
      user.name,
      publishTagMatch[1],
      parsed.data,
    );
    sendJson(
      response,
      result.ok ? 200 : result.error.code === "NOT_FOUND" ? 404 : 400,
      result.ok
        ? (result.value as JsonValue)
        : { error: result.error.message, code: result.error.code },
    );
    return;
  }
  const tagMatch = url.pathname.match(/^\/api\/v1\/tags\/([^/]+)$/);
  if (request.method === "PATCH" && tagMatch) {
    const bodyResult = await fromPromise(readBody(request), () => ({
      code: "INVALID_JSON",
      message: "Invalid JSON payload",
    }));
    if (!bodyResult.ok) {
      sendJson(response, 400, { error: bodyResult.error.message });
      return;
    }
    const parsed = tagUpdateInput.safeParse(bodyResult.value);
    if (!parsed.success) {
      sendJson(response, 400, {
        error: "标签内容无效",
        code: "INVALID_TAG_INPUT",
      });
      return;
    }
    const result = await updateTag(user.id, tagMatch[1], parsed.data);
    sendJson(
      response,
      result.ok ? 200 : result.error.code === "NOT_FOUND" ? 404 : 409,
      result.ok
        ? (result.value as JsonValue)
        : { error: result.error.message, code: result.error.code },
    );
    return;
  }
  if (request.method === "DELETE" && tagMatch) {
    const result = await removeTag(user.id, tagMatch[1]);
    sendJson(
      response,
      result.ok ? 200 : result.error.code === "TAG_HAS_CHILDREN" ? 409 : 404,
      result.ok
        ? (result.value as JsonValue)
        : { error: result.error.message, code: result.error.code },
    );
    return;
  }

  sendJson(response, 404, { error: "Not found" });
}

const server = createServer((request, response) => {
  const url = new URL(
    request.url || "/",
    `http://${request.headers.host || "localhost"}`,
  );
  if (url.pathname.startsWith("/api/trpc")) {
    trpcHandler(request, response);
    return;
  }
  handleRest(request, response, url).catch((error: Error) => {
    console.error("backend request failed", {
      code: "INTERNAL_SERVER_ERROR",
      message: error.message,
    });
    sendJson(response, 500, {
      error: "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
    });
  });
});

initializeDatabase()
  .then(() =>
    server.listen(config.PORT, () =>
      console.log(
        `bookmark-nav backend listening on http://localhost:${config.PORT}`,
        { configSource },
      ),
    ),
  )
  .catch((error: Error) => {
    console.error("backend database initialization failed", {
      code: "DATABASE_INITIALIZATION_FAILED",
      message: error.message,
      database: config.MONGODB_DB,
    });
    process.exitCode = 1;
  });

process.once("SIGTERM", () => {
  void closeDatabase();
});
process.once("SIGINT", () => {
  void closeDatabase();
});
