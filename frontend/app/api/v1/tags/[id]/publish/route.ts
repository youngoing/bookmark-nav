import { backendAuthHeaders, getBackendUrl } from "../../../../../../lib/backend";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const backendUrl = getBackendUrl(request);
  const headers = backendAuthHeaders(request);
  headers.set("content-type", "application/json");
  return fetch(`${backendUrl}/api/v1/tags/${encodeURIComponent(id)}/publish`, { method: "POST", headers, body: await request.text() });
}
