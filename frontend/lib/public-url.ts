export function getPublicUrl(path: string, request: Request): URL {
  const configuredOrigin = process.env.APP_URL?.trim();
  if (configuredOrigin) return new URL(path, new URL(configuredOrigin).origin);

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedHost) return new URL(path, `${forwardedProto || "https"}://${forwardedHost}`);

  return new URL(path, request.url);
}
