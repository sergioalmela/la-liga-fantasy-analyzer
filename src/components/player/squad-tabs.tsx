'use client'

import { ListChecks, Users } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/i18n/language-provider'

export function SquadTabs({
  leagueId,
  teamId,
  active,
}: {
  leagueId: string
  teamId: string
  active: 'players' | 'lineup'
}) {
  const { t } = useLanguage()
  const tabs = [
    {
      id: 'players' as const,
      href: `/leagues/${leagueId}/${teamId}/players`,
      label: t('squadTabs.players'),
      icon: Users,
    },
    {
      id: 'lineup' as const,
      href: `/leagues/${leagueId}/${teamId}/lineup`,
      label: t('squadTabs.lineup'),
      icon: ListChecks,
    },
  ]

  return (
    <nav
      aria-label={t('squadTabs.label')}
      className="mb-8 flex gap-1 border-b border-gray-200"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        const selected = active === tab.id
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={selected ? 'page' : undefined}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              selected
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800'
            }`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
