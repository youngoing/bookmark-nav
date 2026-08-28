import { proxyBetterAuth } from "../../../../lib/better-auth-proxy";

export function GET(request: Request): Promise<Response> {
  return proxyBetterAuth(request, "callback/google");
}
