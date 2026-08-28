import { proxyBetterAuth } from "../../../../lib/better-auth-proxy";

export async function POST(request: Request): Promise<Response> {
  return proxyBetterAuth(request, "sign-in/email");
}
