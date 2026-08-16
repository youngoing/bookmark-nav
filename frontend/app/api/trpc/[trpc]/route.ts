import { getBackendUrl } from "../../../../lib/backend";

async function proxy(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const backendUrl = getBackendUrl(request);
  return fetch(`${backendUrl}${url.pathname}${url.search}`, {
    method: request.method,
    headers: request.headers,
    body: request.method === "GET" ? undefined : await request.text(),
  });
}

export const GET = proxy;
export const POST = proxy;
