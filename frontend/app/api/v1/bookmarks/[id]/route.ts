import { backendAuthHeaders, backendUrl } from "../../../../../lib/backend";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const headers = backendAuthHeaders(request);
  headers.set("content-type", "application/json");
  return fetch(`${backendUrl}/api/v1/bookmarks/${encodeURIComponent(id)}`, { method: "PATCH", headers, body: await request.text() });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  return fetch(`${backendUrl}/api/v1/bookmarks/${encodeURIComponent(id)}`, { method: "DELETE", headers: backendAuthHeaders(request) });
}
