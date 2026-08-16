import { backendAuthHeaders, getBackendUrl } from "../../../../../lib/backend";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const backendUrl = getBackendUrl(request);
  return fetch(`${backendUrl}/api/v1/bookmarks/page${url.search}`, { cache: "no-store", headers: backendAuthHeaders(request) });
}
