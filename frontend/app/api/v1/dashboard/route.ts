import { backendAuthHeaders, getBackendUrl } from "../../../../lib/backend";

export async function GET(request: Request): Promise<Response> {
  const backendUrl = getBackendUrl(request);
  const cookie = request.headers.get("cookie");
  // eslint-disable-next-line no-console
  console.log("[dashboard proxy] cookie present:", cookie ? "yes" : "no", "length:", cookie?.length ?? 0);
  return fetch(`${backendUrl}/api/v1/dashboard`, { cache: "no-store", headers: backendAuthHeaders(request) });
}
