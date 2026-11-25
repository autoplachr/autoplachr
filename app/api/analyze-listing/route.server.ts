import { analyzeListing } from "../../../worker/analyze-listing.mjs";
import { getSupabaseServerClient } from "../../../src/lib/supabase/server";
import { isAllowedBase64ImageDataUrl } from "../../../src/lib/sanitize";
import { checkVisionApiLimit } from "../../../src/lib/rate-limit";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, { status: 403 });
  if (!checkVisionApiLimit(request).allowed) return new Response(null, { status: 429 });
  const auth = await getSupabaseServerClient();
  if (auth && !(await auth.auth.getUser()).data.user) return new Response(null, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!Array.isArray(body?.photos) || !body.photos.length || body.photos.length > 8 ||
      !body.photos.every((photo: { src?: unknown }) => isAllowedBase64ImageDataUrl(photo?.src))) {
    return new Response(null, { status: 400 });
  }
  return Response.json(await analyzeListing(body, process.env), { headers: { "cache-control": "no-store" } });
}
