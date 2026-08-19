import { Outlet } from 'react-router'
import { ShieldAlert } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { PageLoader } from '@/components/ui/loader'
import { SectionedLayout } from '@/components/ui/sectioned-layout'
import { usePlatformAccess } from '@/features/platform/hooks'
import { GROUPS } from './platform-nav'

/**
 * Shell de la consola de plataforma, con su propia navegación —la misma forma
 * que Configuración y Ayuda (`SectionedLayout`, §11.1.3)—.
 *
 * **La comprobación de aquí es orientativa, no autorización.** Sirve para no
 * pintar una consola que va a responder 403 en cada petición; el guard de verdad
 * está en `/admin/*` y se vuelve a comprobar contra la tabla en cada llamada, así
 * que un cliente que se mienta a sí mismo solo consigue errores. Por eso se
 * enseña un estado y no se redirige a escondidas: quien llegue aquí por un enlace
 * viejo merece saber qué pasó.
 *
 * Y ningún rol de organización abre esta puerta: ser OWNER de la tuya no te hace
 * superadmin.
 */
export function PlatformLayout() {
  const { isPlatformAdmin, isLoading } = usePlatformAccess()

  if (isLoading) return <PageLoader />

  if (!isPlatformAdmin) {
    return (
      <EmptyState
        Icon={ShieldAlert}
        title="Esta sección es de la plataforma"
        description="Administra todas las organizaciones de Nummo, y tu cuenta no tiene ese acceso. No tiene nada que ver con tu rol en la organización."
      />
    )
  }

  return (
    <SectionedLayout label="Plataforma" groups={GROUPS}>
      <Outlet />
    </SectionedLayout>
  )
}
