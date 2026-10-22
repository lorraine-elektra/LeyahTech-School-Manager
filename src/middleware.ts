import { NextResponse, type NextRequest } from 'next/server';

// Layouts cannot see the URL, so the path is passed along for the first-sign-in password check.
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set('x-pathname', request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico|api/health).*)'],
};
