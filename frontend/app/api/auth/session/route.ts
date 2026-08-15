import { backendAuthHeaders, backendUrl } from "../../../../lib/backend";

export async function GET(request: Request): Promise<Response> {
  return fetch(`${backendUrl}/api/auth/session`, { cache: "no-store", headers: backendAuthHeaders(request) });
}
