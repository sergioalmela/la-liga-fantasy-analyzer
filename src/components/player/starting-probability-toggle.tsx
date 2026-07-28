'use client'

import { Eye, EyeOff, Percent } from 'lucide-react'
import { useLanguage } from '@/i18n/language-provider'
import { Button } from '../ui/button'

interface StartingProbabilityToggleProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
}

export function StartingProbabilityToggle({
  enabled,
  onChange,
}: StartingProbabilityToggleProps) {
  const { t } = useLanguage()
  const VisibilityIcon = enabled ? EyeOff : Eye

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-pressed={enabled}
      onClick={() => onChange(!enabled)}
      className="gap-2"
    >
      <Percent className="h-4 w-4" />
      {t(enabled ? 'probability.hide' : 'probability.show')}
      <VisibilityIcon className="h-4 w-4" />
    </Button>
  )
}
