import { backendAuthHeaders, getBackendUrl } from "../../../../../lib/backend";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return fetch(`${getBackendUrl(request)}/api/v1/api-keys/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: backendAuthHeaders(request),
  });
}
