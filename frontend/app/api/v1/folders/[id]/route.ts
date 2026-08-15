import { backendAuthHeaders, backendUrl } from "../../../../../lib/backend";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const headers = backendAuthHeaders(request);
  headers.set("content-type", "application/json");
  return fetch(`${backendUrl}/api/v1/folders/${encodeURIComponent(id)}`, { method: "PATCH", headers, body: await request.text() });
}
