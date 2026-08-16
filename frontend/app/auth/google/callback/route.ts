import { NextResponse } from "next/server";
import { loginResponse } from "@loomark/shared";
import { getBackendUrl } from "../../../../lib/backend";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const storedState = request.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)google_oauth_state=([^;]+)/)?.[1];
  const failureRedirect = new URL("/", request.url);
  if (url.searchParams.has("error"))
    failureRedirect.searchParams.set("google_error", "cancelled");
  if (!state || !storedState || state !== storedState || !code) {
    console.warn("[google oauth callback] validation failed", {
      hasProviderError: url.searchParams.has("error"),
      hasState: Boolean(state),
      hasStoredState: Boolean(storedState),
      stateMatches: Boolean(state && storedState && state === storedState),
      hasCode: Boolean(code),
    });
    failureRedirect.searchParams.set("google_error", "invalid_state");
    return NextResponse.redirect(failureRedirect);
  }
  console.info("[google oauth callback] validation passed");
  const backendResponse = await fetch(
    `${getBackendUrl(request)}/api/auth/google/callback`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    },
  ).catch(() => null);
  const body = await backendResponse?.json().catch(() => null);
  if (!backendResponse?.ok) {
    const errorCode =
      body &&
      typeof body === "object" &&
      "code" in body &&
      typeof body.code === "string"
        ? body.code
        : "failed";
    console.error("[google oauth callback] backend rejected login", {
      status: backendResponse?.status ?? null,
      errorCode,
    });
    failureRedirect.searchParams.set("google_error", errorCode);
    return NextResponse.redirect(failureRedirect);
  }
  const parsed = loginResponse.safeParse(body);
  if (!parsed.success) {
    console.error("[google oauth callback] invalid backend response", {
      status: backendResponse.status,
    });
    failureRedirect.searchParams.set("google_error", "failed");
    return NextResponse.redirect(failureRedirect);
  }
  console.info("[google oauth callback] login succeeded");
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete("google_oauth_state");
  response.cookies.set("bookmark_session", parsed.data.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return response;
}
