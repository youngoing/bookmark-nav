import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicUrl } from "./public-url";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getPublicUrl", () => {
  it("uses the configured public origin", () => {
    vi.stubEnv("APP_URL", "https://youngoing.cn");
    const request = new Request("http://0.0.0.0:3000/auth/google/callback");

    expect(getPublicUrl("/?google_error=failed", request).toString()).toBe(
      "https://youngoing.cn/?google_error=failed",
    );
  });

  it("uses forwarded headers when APP_URL is not configured", () => {
    vi.stubEnv("APP_URL", "");
    const request = new Request("http://0.0.0.0:3000/auth/google/callback", {
      headers: {
        "x-forwarded-host": "example.com",
        "x-forwarded-proto": "https",
      },
    });

    expect(getPublicUrl("/", request).toString()).toBe("https://example.com/");
  });

  it("falls back to the request origin", () => {
    vi.stubEnv("APP_URL", "");
    const request = new Request("http://localhost:3000/auth/google/callback");

    expect(getPublicUrl("/", request).toString()).toBe(
      "http://localhost:3000/",
    );
  });
});
