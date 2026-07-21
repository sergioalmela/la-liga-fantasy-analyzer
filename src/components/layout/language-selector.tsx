'use client'

import { Languages } from 'lucide-react'
import { useId } from 'react'
import { useLanguage } from '@/i18n/language-provider'
import type { Locale } from '@/i18n/messages'

export function LanguageSelector() {
  const { locale, setLocale, t } = useLanguage()
  const id = useId()

  return (
    <label htmlFor={id} className="inline-flex items-center gap-2">
      <Languages className="h-4 w-4 text-gray-500" aria-hidden="true" />
      <span className="sr-only">{t('language.label')}</span>
      <select
        id={id}
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        aria-label={t('language.label')}
        className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        <option value="es">{t('language.es')}</option>
        <option value="en">{t('language.en')}</option>
      </select>
    </label>
  )
}
