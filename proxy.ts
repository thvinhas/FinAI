import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const supabase = createClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage = pathname.startsWith("/login");

  if (!user && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
