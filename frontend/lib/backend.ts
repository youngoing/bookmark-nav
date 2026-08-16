const LOCAL_BACKEND_URL = "http://localhost:4000";
const PRODUCTION_BACKEND_URL = "http://127.0.0.1:4001";

export function getBackendUrl(request: Request): string {
  const configuredUrl = process.env.BACKEND_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/+$/, "");

  const { hostname } = new URL(request.url);
  return hostname === "localhost" || hostname === "127.0.0.1"
    ? LOCAL_BACKEND_URL
    : PRODUCTION_BACKEND_URL;
}

export function backendAuthHeaders(request: Request): Headers {
  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  const authorization = request.headers.get("authorization");
  if (cookie) headers.set("cookie", cookie);
  if (authorization) headers.set("authorization", authorization);
  return headers;
}
