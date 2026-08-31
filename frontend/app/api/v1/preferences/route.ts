import { backendAuthHeaders, getBackendUrl } from "../../../../lib/backend";

export async function GET(request: Request): Promise<Response> {
  const backendUrl = getBackendUrl(request);
  return fetch(`${backendUrl}/api/v1/preferences`, {
    method: "GET",
    headers: backendAuthHeaders(request),
    cache: "no-store",
  });
}

export async function PATCH(request: Request): Promise<Response> {
  const backendUrl = getBackendUrl(request);
  const headers = backendAuthHeaders(request);
  headers.set("content-type", "application/json");
  return fetch(`${backendUrl}/api/v1/preferences`, {
    method: "PATCH",
    headers,
    body: await request.text(),
  });
}
