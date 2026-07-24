import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "7y_session";

const PUBLIC_PATHS = ["/"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get(SESSION_COOKIE)?.value;

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (!session && !isPublicPath) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session && pathname === "/") {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|img).*)"],
};