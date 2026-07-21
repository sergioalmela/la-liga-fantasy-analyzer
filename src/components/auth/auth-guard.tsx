'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useLanguage } from '@/i18n/language-provider'
import { isAuthenticated } from '@/lib/auth'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let active = true

    void isAuthenticated().then((authenticated) => {
      if (!active) return

      if (!authenticated) {
        router.replace('/login')
        return
      }

      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600" />
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
