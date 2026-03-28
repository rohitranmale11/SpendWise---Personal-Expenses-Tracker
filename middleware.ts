import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Temporarily disabled to test login redirect issue
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/expenses/:path*',
    '/categories/:path*',
    '/budgets/:path*',
    '/subscriptions/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/login',
    '/signup',
  ],
}
