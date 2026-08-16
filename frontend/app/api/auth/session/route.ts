import { backendAuthHeaders, getBackendUrl } from "../../../../lib/backend";

export async function GET(request: Request): Promise<Response> {
  const backendUrl = getBackendUrl(request);
  return fetch(`${backendUrl}/api/auth/session`, { cache: "no-store", headers: backendAuthHeaders(request) });
}
