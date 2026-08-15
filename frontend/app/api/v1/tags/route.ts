import { backendAuthHeaders, backendUrl } from "../../../../lib/backend";

export async function POST(request: Request): Promise<Response> {
  const headers = backendAuthHeaders(request);
  headers.set("content-type", "application/json");
  return fetch(`${backendUrl}/api/v1/tags`, { method: "POST", headers, body: await request.text() });
}
