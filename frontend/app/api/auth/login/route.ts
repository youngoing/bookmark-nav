import { NextResponse } from "next/server";
import { loginResponse } from "@loomark/shared";
import { getBackendUrl } from "../../../../lib/backend";

export async function POST(request: Request): Promise<Response> {
  const backendUrl = getBackendUrl(request);
  const upstream = await fetch(`${backendUrl}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: await request.text() });
  const parsed = loginResponse.safeParse(await upstream.json());
  if (!parsed.success || !upstream.ok) return NextResponse.json({ error: "邮箱或密码不正确" }, { status: upstream.status });
  const payload = parsed.data;
  const response = NextResponse.json({ user: payload.user });
  response.cookies.set("bookmark_session", payload.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 7, path: "/" });
  return response;
}
