import { backendAuthHeaders, getBackendUrl } from "../../../../../lib/backend";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const backendUrl = getBackendUrl(request);
  const headers = backendAuthHeaders(request);
  headers.set("content-type", "application/json");
  return fetch(`${backendUrl}/api/v1/sites/${encodeURIComponent(id)}`, { method: "PATCH", headers, body: await request.text() });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const backendUrl = getBackendUrl(request);
  return fetch(`${backendUrl}/api/v1/sites/${encodeURIComponent(id)}`, { method: "DELETE", headers: backendAuthHeaders(request) });
}
