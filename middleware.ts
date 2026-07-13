import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/session/constants'

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/auth/login',
  '/auth/github/callback',
  '/auth/vercel/callback',
  '/api/auth',
  '/api/github', // GitHub webhook routes
]

// Routes that should redirect to dashboard if already authenticated
const AUTH_ROUTES = ['/auth/login']

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const cookieStore = request.cookies
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))

  // If accessing an auth route and already authenticated, redirect to dashboard
  if (isAuthRoute && sessionCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // If accessing a protected route without session, redirect to login
  if (!isPublicRoute && !sessionCookie) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
