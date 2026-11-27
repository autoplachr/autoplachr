import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname, searchParams, search } = request.nextUrl;
  const legacy = pathname === "/" ? searchParams.get("oglas") : null;
  if (legacy && /^[a-z\d][a-z\d-]{0,299}$/i.test(legacy)) {
    const target = new URL("/api/legacy-listing", request.url);
    target.searchParams.set("id", legacy);
    return NextResponse.rewrite(target);
  }
  if (pathname.startsWith("/oglasi/")) {
    return NextResponse.redirect(new URL(pathname.replace("/oglasi/", "/oglas/") + search, request.url), 301);
  }
  if (pathname.startsWith("/rabljena-vozila/grad/")) {
    return NextResponse.redirect(new URL(pathname.replace("/rabljena-vozila/grad/", "/grad/") + search, request.url), 301);
  }
  if (pathname !== "/racun" && pathname !== "/predaj-oglas") return NextResponse.next();

  const login = new URL("/prijava", request.url);
  login.searchParams.set("next", pathname + search);
  const redirect = NextResponse.redirect(login, 307);
  let response = NextResponse.next();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return redirect;
  const auth = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies) {
        for (const { name, value } of cookies) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookies) {
          response.cookies.set(name, value, options);
          redirect.cookies.set(name, value, options);
        }
      },
    },
  });
  try {
    const { data, error } = await auth.auth.getUser();
    return !error && data.user ? response : redirect;
  } catch {
    return redirect;
  }
}

export const config = {
  matcher: ["/", "/racun", "/predaj-oglas", "/oglasi/:slug", "/rabljena-vozila/grad/:city"],
};
