import { backendAuthHeaders, getBackendUrl } from "../../../../../lib/backend";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const backendUrl = getBackendUrl(request);
  return fetch(`${backendUrl}/api/v1/shared-collections/${encodeURIComponent(id)}`, { method: "DELETE", headers: backendAuthHeaders(request) });
}
