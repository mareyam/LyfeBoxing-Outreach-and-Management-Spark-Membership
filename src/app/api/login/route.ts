import { NextRequest, NextResponse } from "next/server";
import { SITE_AUTH_COOKIE, authToken, tokensMatch } from "@/lib/siteAuth";

export async function POST(req: NextRequest) {
  const password = process.env.SITE_PASSWORD?.trim();
  if (!password) {
    return NextResponse.json({ ok: true, open: true });
  }

  const body = await req.json().catch(() => ({}));
  const supplied = typeof body?.password === "string" ? body.password : "";
  const expected = await authToken(password);
  const actual = await authToken(supplied);
  if (!tokensMatch(actual, expected)) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  const forwarded = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const secure = forwarded ? forwarded === "https" : req.nextUrl.protocol === "https:";
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SITE_AUTH_COOKIE, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
