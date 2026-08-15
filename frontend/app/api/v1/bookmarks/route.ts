import { backendAuthHeaders, backendUrl } from "../../../../lib/backend";

export async function GET(request: Request): Promise<Response> {
  return fetch(`${backendUrl}/api/v1/bookmarks`, { cache: "no-store", headers: backendAuthHeaders(request) });
}

export async function POST(request: Request): Promise<Response> {
  const headers = backendAuthHeaders(request);
  headers.set("content-type", request.headers.get("content-type") || "application/json");
  return fetch(`${backendUrl}/api/v1/bookmarks`, {
    method: "POST",
    headers,
    body: await request.text(),
  });
}
