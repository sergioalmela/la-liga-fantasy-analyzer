'use client'

import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'
import { LanguageSelector } from '@/components/layout/language-selector'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/i18n/language-provider'
import { login } from '@/lib/auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const emailId = useId()
  const passwordId = useId()
  const { t } = useLanguage()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!email || !password) {
        setError(t('login.required'))
        return
      }

      const result = await login(email, password)

      if (!result.authenticated) {
        setError(t('login.invalid'))
        return
      }

      router.replace('/leagues')
      router.refresh()
    } catch {
      setError(t('login.failed'))
    } finally {
      setPassword('')
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <LanguageSelector />
      </div>
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            La Liga Fantasy
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('login.subtitle')}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('login.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor={emailId}
                  className="block text-sm font-medium text-gray-700"
                >
                  {t('login.email')}
                </label>
                <div className="mt-1">
                  <input
                    id={emailId}
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder={t('login.emailPlaceholder')}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor={passwordId}
                  className="block text-sm font-medium text-gray-700"
                >
                  {t('login.password')}
                </label>
                <div className="mt-1">
                  <input
                    id={passwordId}
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder={t('login.passwordPlaceholder')}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div>
                <Button
                  type="submit"
                  disabled={loading || !email.trim() || !password.trim()}
                  className="w-full"
                >
                  {loading ? t('login.submitting') : t('login.submit')}
                </Button>
              </div>
            </form>

            <div className="mt-6 p-4 bg-blue-50 rounded-md">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                {t('login.aboutTitle')}
              </h4>
              <p className="text-xs text-blue-700">{t('login.about')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
