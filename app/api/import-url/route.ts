import { importClassifieds } from "../../../src/lib/classifieds-import";
import { analyzeListing } from "../../../worker/analyze-listing.mjs";

export const runtime = "nodejs";
export const maxDuration = 60;

export function POST(request: Request) {
  const env = process.env;
  return importClassifieds(request, env, photos => analyzeListing({ photos }, env));
}
