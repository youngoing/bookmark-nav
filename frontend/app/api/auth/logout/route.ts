import { proxyBetterAuth } from "../../../../lib/better-auth-proxy";

export function POST(request: Request): Promise<Response> {
  return proxyBetterAuth(request, "sign-out");
}
