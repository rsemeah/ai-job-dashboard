import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/health',
  '/auth/callback',
  '/auth/error',
  '/landing',
  '/terms',
  '/privacy',
  '/waitlist',
]

const AUTH_ROUTES = [
  '/login',
  '/signup',
]

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  const isApiRoute = pathname.startsWith('/api')
  if (isApiRoute) {
    return response
  }

  const isPublicRoute = PUBLIC_ROUTES.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  )

  const isAuthRoute = AUTH_ROUTES.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  )

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/jobs'
    return NextResponse.redirect(url)
  }

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    // Root path unauthenticated users → landing page
    if (pathname === '/') {
      url.pathname = '/landing'
      url.search = ''
      return NextResponse.redirect(url)
    }
    // All other protected routes → login with redirect back
    const redirectTo = encodeURIComponent(pathname + request.nextUrl.search)
    url.pathname = '/login'
    url.search = `?redirect=${redirectTo}`
    return NextResponse.redirect(url)
  }

  return response
}
