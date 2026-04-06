import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/onboarding',
  '/auth/callback',
  '/auth/error',
  '/landing',
  '/terms',
  '/privacy',
]

// Routes that should redirect to dashboard if already authenticated
const AUTH_ROUTES = [
  '/login',
  '/signup',
]

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANT: Do not run code between createServerClient and getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Check if current route is public or an API route
  const isApiRoute = pathname.startsWith('/api')
  
  // Skip all middleware checks for API routes - they handle their own auth
  if (isApiRoute) {
    return supabaseResponse
  }

  // Check if current route is public
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )

  // Check if current route is an auth route (login/signup)
  const isAuthRoute = AUTH_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )

  // If user is logged in and trying to access auth routes, redirect to dashboard
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // If user is not logged in and trying to access protected routes
  if (!user && !isPublicRoute) {
    // Store the original URL to redirect back after login
    const url = request.nextUrl.clone()
    const redirectTo = encodeURIComponent(pathname + request.nextUrl.search)
    url.pathname = '/login'
    url.search = `?redirect=${redirectTo}`
    return NextResponse.redirect(url)
  }

  // If user is logged in and accessing protected routes, check onboarding status
  const isOnboardingRoute = pathname === '/onboarding' || pathname.startsWith('/onboarding/')
  
  if (user && !isPublicRoute && !isOnboardingRoute) {
    const { data: profile } = await supabase
      .from('user_profile')
      .select('onboarding_complete')
      .eq('user_id', user.id)
      .single()

    // No profile or onboarding not complete - redirect to onboarding
    if (!profile?.onboarding_complete) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }
  }

  // IMPORTANT: Return the supabaseResponse object as-is to maintain session cookies
  return supabaseResponse
}
