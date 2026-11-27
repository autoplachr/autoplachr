import { NextResponse } from "next/server";
import { vehicleListingPath } from "../../../src/lib/seo";

export function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id || !/^[a-z\d][a-z\d-]{0,299}$/i.test(id)) return new NextResponse(null, { status: 404 });
  return NextResponse.redirect(new URL(vehicleListingPath(id), url), 301);
}
