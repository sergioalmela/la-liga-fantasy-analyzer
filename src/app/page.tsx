'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useLanguage } from '@/i18n/language-provider'
import { isAuthenticated } from '@/lib/auth'

export default function Home() {
  const router = useRouter()
  const { t } = useLanguage()

  useEffect(() => {
    let active = true

    void isAuthenticated().then((authenticated) => {
      if (!active) return
      router.replace(authenticated ? '/leagues' : '/login')
    })

    return () => {
      active = false
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto" />
        <p className="mt-4 text-gray-600">{t('home.redirecting')}</p>
      </div>
    </div>
  )
}
