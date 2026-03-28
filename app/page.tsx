'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Only redirect if user is authenticated
    if (!loading && user) {
      router.replace('/dashboard')
    }
  }, [user, loading, router])

  // Show loading or home page
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // If not authenticated, show landing/home page
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-4xl mx-auto p-8 text-center">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Welcome to SpendWise
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Your Personal Expense Tracker
        </p>
        <div className="space-y-4">
          <a
            href="/login"
            className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Sign In
          </a>
          <a
            href="/signup"
            className="inline-block px-6 py-3 border border-border bg-background text-foreground rounded-lg font-medium hover:bg-muted transition-colors"
          >
            Sign Up
          </a>
        </div>
      </div>
    </div>
  )
}
