import { backendAuthHeaders, getBackendUrl } from "../../../../lib/backend";

export async function GET(request: Request): Promise<Response> {
  return fetch(`${getBackendUrl(request)}/api/v1/api-keys`, {
    cache: "no-store",
    headers: backendAuthHeaders(request),
  });
}

export async function POST(request: Request): Promise<Response> {
  const headers = backendAuthHeaders(request);
  headers.set("content-type", "application/json");
  return fetch(`${getBackendUrl(request)}/api/v1/api-keys`, {
    method: "POST",
    headers,
    body: await request.text(),
  });
}
