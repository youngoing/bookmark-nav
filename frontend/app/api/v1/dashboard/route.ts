import { backendAuthHeaders, backendUrl } from "../../../../lib/backend";

export async function GET(request: Request): Promise<Response> {
  return fetch(`${backendUrl}/api/v1/dashboard`, { cache: "no-store", headers: backendAuthHeaders(request) });
}
