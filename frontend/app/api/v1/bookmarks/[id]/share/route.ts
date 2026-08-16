import { backendAuthHeaders, getBackendUrl } from "../../../../../../lib/backend";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const backendUrl = getBackendUrl(request);
  return fetch(`${backendUrl}/api/v1/bookmarks/${encodeURIComponent(id)}/share`, { method: "POST", headers: backendAuthHeaders(request) });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const backendUrl = getBackendUrl(request);
  return fetch(`${backendUrl}/api/v1/bookmarks/${encodeURIComponent(id)}/share`, { method: "DELETE", headers: backendAuthHeaders(request) });
}
