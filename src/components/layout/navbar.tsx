'use client'

import { LogOut, Trophy, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/i18n/language-provider'
import { logout } from '@/lib/auth'
import { userService } from '@/services/user-service'
import { LanguageSelector } from './language-selector'

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [managerName, setManagerName] = useState<string | null>(null)
  const { t } = useLanguage()
  const navigation = [
    { name: t('nav.leagues'), href: '/leagues', icon: Trophy },
  ]

  useEffect(() => {
    let active = true

    const loadUser = async () => {
      const result = await userService.getCurrentUser()
      if (!active) return

      if (result.status === 401) {
        await logout()
        router.replace('/login')
        router.refresh()
        return
      }

      if (result.data) setManagerName(result.data.managerName)
    }

    void loadUser()
    return () => {
      active = false
    }
  }, [router])

  const handleLogout = async () => {
    await logout()
    router.replace('/login')
    router.refresh()
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/leagues" className="text-xl font-bold text-gray-900">
                <span className="sm:hidden">LALIGA</span>
                <span className="hidden sm:inline">La Liga Fantasy</span>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`${
                      pathname === item.href
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm inline-flex items-center`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            {managerName && (
              <div className="hidden items-center gap-2 text-sm text-gray-600 md:flex">
                <User className="h-4 w-4" />
                <span>{managerName}</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="inline-flex items-center"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{t('nav.logout')}</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
