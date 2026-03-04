import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_ROUTES = ["/login", "/register", "/verify-email", "/reset-password"];
const PROTECTED_ROUTES = ["/dashboard", "/plan", "/tracking", "/education", "/events", "/settings"];
const ONBOARDING_ROUTES = ["/onboarding"];

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.some((r) => pathname.startsWith(r));
}

function isProtectedRoute(pathname: string) {
  return PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
}

function isOnboardingRoute(pathname: string) {
  return ONBOARDING_ROUTES.some((r) => pathname.startsWith(r));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;
  const onboardingComplete = request.cookies.get("onboarding_complete")?.value;

  // Redirect unauthenticated users away from protected routes
  if (isProtectedRoute(pathname) && !token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth routes
  if (isAuthRoute(pathname) && token) {
    const url = request.nextUrl.clone();
    url.pathname = onboardingComplete ? "/dashboard" : "/onboarding/welcome";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users to onboarding if not completed
  if (isProtectedRoute(pathname) && token && !onboardingComplete) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding/welcome";
    return NextResponse.redirect(url);
  }

  // Redirect unauthenticated users away from onboarding
  if (isOnboardingRoute(pathname) && !token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icons|sw.js|manifest|privacy|terms).*)",
  ],
};
