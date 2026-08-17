import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Check, Monitor, Moon, Sun } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canManageOrg } from '@/features/organizations/roles'
import { useThemeStore, type ThemeMode } from '@/stores/theme'
import { getErrorMessage } from '@/lib/errors'
import type { OrganizationSettingsThemeMode } from '@/api/generated/model'
import { cn } from '@/lib/utils'
import { useOrgSettings, useUpdateSettings } from './hooks'

const MODE_TO_ENUM: Record<ThemeMode, OrganizationSettingsThemeMode> = {
  light: 'LIGHT',
  dark: 'DARK',
  system: 'SYSTEM',
}
const ENUM_TO_MODE: Record<OrganizationSettingsThemeMode, ThemeMode> = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
}

const OPTIONS: { mode: ThemeMode; label: string; description: string; Icon: LucideIcon }[] = [
  { mode: 'light', label: 'Claro', description: 'Siempre claro', Icon: Sun },
  { mode: 'dark', label: 'Oscuro', description: 'Siempre oscuro', Icon: Moon },
  { mode: 'system', label: 'Sistema', description: 'Según el dispositivo', Icon: Monitor },
]

export function AppearancePage() {
  const { orgId, role } = useCurrentOrg()
  const { settings } = useOrgSettings(orgId)
  const mode = useThemeStore((s) => s.mode)
  const setMode = useThemeStore((s) => s.setMode)
  const updateSettings = useUpdateSettings(orgId ?? '')
  const canManage = canManageOrg(role)

  // Refleja el tema por defecto de la organización una vez al cargar.
  const syncedRef = useRef(false)
  useEffect(() => {
    if (settings && !syncedRef.current) {
      syncedRef.current = true
      setMode(ENUM_TO_MODE[settings.themeMode])
    }
  }, [settings, setMode])

  const choose = async (m: ThemeMode) => {
    setMode(m)
    if (canManage && orgId) {
      try {
        await updateSettings.mutateAsync({ orgId, data: { themeMode: MODE_TO_ENUM[m] } })
        toast.success('Tema de la organización actualizado')
      } catch (err) {
        toast.error(getErrorMessage(err, 'No se pudo guardar el tema'))
      }
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Apariencia" description="Personaliza el tema de la interfaz." />
      <Card>
        <CardHeader>
        <CardTitle>Tema</CardTitle>
        <CardDescription>
          {canManage
            ? 'Define el tema por defecto de la organización.'
            : 'Cambia el tema en este dispositivo (no afecta a la organización).'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          role="radiogroup"
          aria-label="Tema"
          className="grid gap-3 sm:grid-cols-3"
        >
          {OPTIONS.map(({ mode: m, label, description, Icon }) => {
            const active = mode === m
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => choose(m)}
                className={cn(
                  'relative flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors hover:bg-accent',
                  active && 'border-primary ring-2 ring-primary/30',
                )}
              >
                {active && <Check className="absolute top-3 right-3 size-4 text-primary" />}
                <Icon className="size-5" />
                <div>
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-muted-foreground">{description}</div>
                </div>
              </button>
            )
          })}
        </div>
      </CardContent>
      </Card>
    </div>
  )
}
