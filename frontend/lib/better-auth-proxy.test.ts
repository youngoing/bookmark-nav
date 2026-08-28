import { afterEach, describe, expect, it, vi } from "vitest";
import { proxyBetterAuth } from "./better-auth-proxy";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("proxyBetterAuth", () => {
  it("forwards the request body, cookies and public proxy headers", async () => {
    vi.stubEnv("BACKEND_URL", "http://backend:4000");
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(input.toString()).toBe("http://backend:4000/api/auth/sign-in/email");
      expect(init?.method).toBe("POST");
      expect(new Headers(init?.headers).get("cookie")).toBe("oauth_state=state");
      expect(new Headers(init?.headers).get("x-forwarded-host")).toBe(
        "youngoing.cn",
      );
      expect(new Headers(init?.headers).get("x-forwarded-proto")).toBe("https");
      expect(
        JSON.parse(Buffer.from(init?.body as ArrayBuffer).toString("utf8")),
      ).toEqual({ email: "person@example.com", password: "password123" });
      return new Response(JSON.stringify({ user: { id: "user-1" } }), {
        headers: {
          "content-type": "application/json",
          "set-cookie": "bookmark_nav.session_token=session; Path=/; HttpOnly",
        },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await proxyBetterAuth(
      new Request("https://youngoing.cn/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "oauth_state=state",
        },
        body: JSON.stringify({
          email: "person@example.com",
          password: "password123",
        }),
      }),
      "sign-in/email",
    );

    expect(response.headers.get("set-cookie")).toContain(
      "bookmark_nav.session_token=session",
    );
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("forwards the legacy Google callback to Better Auth", async () => {
    vi.stubEnv("BACKEND_URL", "http://backend:4000");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(input.toString()).toBe(
        "http://backend:4000/api/auth/callback/google?code=code&state=state",
      );
      return new Response(null, {
        status: 302,
        headers: { location: "https://youngoing.cn/" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await proxyBetterAuth(
      new Request(
        "https://youngoing.cn/auth/google/callback?code=code&state=state",
      ),
      "callback/google",
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://youngoing.cn/");
  });
});
