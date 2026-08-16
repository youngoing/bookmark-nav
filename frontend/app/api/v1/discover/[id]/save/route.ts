import { backendAuthHeaders, getBackendUrl } from "../../../../../../lib/backend";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const backendUrl = getBackendUrl(request);
  return fetch(`${backendUrl}/api/v1/discover/${encodeURIComponent(id)}/save`, { method: "POST", headers: backendAuthHeaders(request) });
}
