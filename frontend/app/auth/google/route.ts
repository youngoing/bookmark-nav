import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getPublicUrl } from "../../../lib/public-url";

function redirectUri(request: Request): string {
  return process.env.GOOGLE_REDIRECT_URI?.trim() || getPublicUrl("/auth/google/callback", request).toString();
}

export async function GET(request: Request): Promise<Response> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) return NextResponse.redirect(getPublicUrl("/?google_error=not_configured", request));
  const state = randomBytes(32).toString("hex");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(request),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return response;
}
