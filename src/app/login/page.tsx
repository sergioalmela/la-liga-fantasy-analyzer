'use client'

import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'
import { LanguageSelector } from '@/components/layout/language-selector'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/i18n/language-provider'
import { type LoginError, login, startLogin } from '@/lib/auth'

export default function LoginPage() {
  const [redirectUrl, setRedirectUrl] = useState('')
  const [opening, setOpening] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<LoginError | 'open' | null>(null)
  const router = useRouter()
  const redirectId = useId()
  const { t } = useLanguage()

  const handleOpen = async () => {
    setOpening(true)
    setError(null)

    // Open the tab synchronously so the browser does not block it as a popup.
    const loginWindow = window.open('', '_blank')
    try {
      const url = await startLogin()
      if (!url) {
        loginWindow?.close()
        setError('open')
        return
      }

      if (loginWindow) {
        loginWindow.opener = null
        loginWindow.location.href = url
      } else {
        window.location.assign(url)
      }
    } finally {
      setOpening(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await login(redirectUrl)

      if (!result.authenticated) {
        setError(result.error ?? 'failed')
        return
      }

      router.replace('/leagues')
      router.refresh()
    } catch {
      setError('failed')
    } finally {
      setRedirectUrl('')
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
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-900">
                  {t('login.step1')}
                </h3>
                <p className="text-sm text-gray-600">{t('login.step1Help')}</p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={opening}
                  onClick={handleOpen}
                  className="w-full"
                >
                  {opening ? t('login.opening') : t('login.open')}
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <h3 className="text-sm font-medium text-gray-900">
                  {t('login.step2')}
                </h3>
                <p className="text-sm text-gray-600">{t('login.step2Help')}</p>
                <div>
                  <label
                    htmlFor={redirectId}
                    className="block text-sm font-medium text-gray-700"
                  >
                    {t('login.redirect')}
                  </label>
                  <div className="mt-1">
                    <input
                      id={redirectId}
                      name="redirectUrl"
                      type="text"
                      autoComplete="off"
                      spellCheck={false}
                      required
                      value={redirectUrl}
                      onChange={(e) => setRedirectUrl(e.target.value)}
                      className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                      placeholder={t('login.redirectPlaceholder')}
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {t(`login.error.${error}`)}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || !redirectUrl.trim()}
                  className="w-full"
                >
                  {loading ? t('login.submitting') : t('login.submit')}
                </Button>
                <p className="text-xs text-gray-500">{t('login.tip')}</p>
              </form>
            </div>

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
