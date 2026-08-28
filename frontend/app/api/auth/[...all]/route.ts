import { proxyBetterAuth } from "../../../../lib/better-auth-proxy";

export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return proxyBetterAuth(request);
}

export function POST(request: Request): Promise<Response> {
  return proxyBetterAuth(request);
}
