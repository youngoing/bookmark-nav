import { afterEach, describe, expect, it } from "vitest";
import { getBackendUrl } from "./backend";

const originalBackendUrl = process.env.BACKEND_URL;

afterEach(() => {
  if (originalBackendUrl === undefined) delete process.env.BACKEND_URL;
  else process.env.BACKEND_URL = originalBackendUrl;
});

describe("getBackendUrl", () => {
  it.each(["localhost", "127.0.0.1"])("uses the local backend for %s", (hostname) => {
    delete process.env.BACKEND_URL;

    expect(getBackendUrl(new Request(`http://${hostname}:3000/api/v1/dashboard`))).toBe("http://localhost:4000");
  });

  it("uses the production backend for non-local requests", () => {
    delete process.env.BACKEND_URL;

    expect(getBackendUrl(new Request("https://bookmarks.example.com/api/v1/dashboard"))).toBe("http://127.0.0.1:4001");
  });

  it("prefers an explicitly configured backend URL", () => {
    process.env.BACKEND_URL = "http://backend:4000/";

    expect(getBackendUrl(new Request("https://bookmarks.example.com/api/v1/dashboard"))).toBe("http://backend:4000");
  });
});
