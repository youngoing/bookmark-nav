import { backendAuthHeaders, backendUrl } from "../../../../../../lib/backend";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  return fetch(`${backendUrl}/api/v1/bookmarks/${encodeURIComponent(id)}/click`, { method: "POST", cache: "no-store", headers: backendAuthHeaders(request) });
}
