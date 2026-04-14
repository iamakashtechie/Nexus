import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

// Define public routes that don't require authentication
const publicRoutes = ['/login'];
// API routes that shouldn't trigger redirects
const apiAuthRoutes = ['/api/auth/route', '/api/auth/logout']; 

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files, manifest, etc.
  // The matcher below already filters most out, but just to be safe:
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('manifest.json') ||
    pathname.includes('manifest.ts')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('nexus_token')?.value;
  const isAuthRoute = publicRoutes.includes(pathname);
  const isApiAuthRoute = pathname.startsWith('/api/auth');

  // Verify the JWT token
  const isValidSession = token ? await verifyToken(token) : null;

  // 1. If user is accessing public routes (like /login)
  if (isAuthRoute) {
    if (isValidSession) {
      return NextResponse.redirect(new URL('/notes', request.url));
    }
    return NextResponse.next();
  }

  // 2. Allow auth API routes to proceed (so user can login/logout)
  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  // 3. For any other route (Protected), verify authentication
  if (!isValidSession) {
    // Redirect unauthenticated users to the login page
    // Using 307 Temporary Redirect is standard
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // User is authenticated and accessing a protected route
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.* (manifest files)
     * - static assets
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest\\.|icon|apple-icon).*)',
  ],
};
