import { NextResponse } from "next/server";
import { getPublicUrl } from "../../../../lib/public-url";

export function GET(request: Request): Response {
  return NextResponse.redirect(
    getPublicUrl("/?error=oauth_route_migrated", request),
  );
}
