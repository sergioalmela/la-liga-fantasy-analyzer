'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { isAuthenticated } from '@/lib/auth'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/leagues')
    } else {
      router.push('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto" />
        <p className="mt-4 text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}
