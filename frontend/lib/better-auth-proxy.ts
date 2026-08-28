import { getBackendUrl } from "./backend";

const BODYLESS_METHODS = new Set(["GET", "HEAD"]);

export async function proxyBetterAuth(
  request: Request,
  targetPath?: string,
): Promise<Response> {
  const incomingUrl = new URL(request.url);
  const path = targetPath || incomingUrl.pathname.replace(/^\/api\/auth\/?/, "");
  const targetUrl = new URL(
    `/api/auth/${path}${incomingUrl.search}`,
    getBackendUrl(request),
  );
  const headers = new Headers(request.headers);
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("host");
  headers.set("x-forwarded-host", incomingUrl.host);
  headers.set("x-forwarded-proto", incomingUrl.protocol.replace(":", ""));

  return fetch(targetUrl, {
    method: request.method,
    headers,
    body: BODYLESS_METHODS.has(request.method)
      ? undefined
      : await request.arrayBuffer(),
    redirect: "manual",
  });
}
