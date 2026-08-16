import { backendAuthHeaders, getBackendUrl } from "../../../../lib/backend";

export async function POST(request: Request): Promise<Response> {
  const backendUrl = getBackendUrl(request);
  const headers = backendAuthHeaders(request);
  headers.set("content-type", "application/json");
  return fetch(`${backendUrl}/api/v1/tags`, { method: "POST", headers, body: await request.text() });
}
