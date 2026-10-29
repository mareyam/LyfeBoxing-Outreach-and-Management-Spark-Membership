import { NextRequest, NextResponse } from "next/server";
import { SITE_AUTH_COOKIE, authToken, tokensMatch } from "@/lib/siteAuth";

// Next.js 16 renamed middleware.ts to proxy.ts. This is the request gate:
// a correct password sets an HttpOnly cookie; if SITE_PASSWORD is unset the site stays open.
export async function proxy(req: NextRequest) {
  const password = process.env.SITE_PASSWORD?.trim();
  if (!password) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname === "/login" || pathname === "/api/login") {
    return NextResponse.next();
  }

  const expected = await authToken(password);
  const supplied = req.cookies.get(SITE_AUTH_COOKIE)?.value ?? "";
  if (tokensMatch(supplied, expected)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const login = req.nextUrl.clone();
  login.pathname = "/login";
  login.search = "";
  if (pathname !== "/") login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
