import { Link } from 'react-router'
import { Lock, Settings2 } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { useCan } from '@/features/platform/permissions'
import { useListFilters } from '@/lib/use-list-filters'
import { ConsentsTab } from './consents-tab'
import { MessagesTab } from './messages-tab'

/** Criterios que viven en la URL, en español como las rutas (§87.5). */
const KEYS = ['vista', 'estado', 'contacto', 'pagina'] as const
type Key = (typeof KEYS)[number]

type Tab = 'mensajes' | 'consentimiento'

const TABS: { value: Tab; label: string }[] = [
  { value: 'mensajes', label: 'Mensajes' },
  { value: 'consentimiento', label: 'Consentimiento' },
]

/**
 * **Cobranza por WhatsApp**: lo que se le ha escrito a quien te debe.
 *
 * Dos pestañas y no dos destinos, por lo mismo que «Vigilar» juntó tres (§47.5):
 * son **la misma pregunta a dos escalas**. Se entra aquí preguntando «¿por qué
 * no le llegó?», y la mitad de las veces la respuesta —«pidió no recibir
 * mensajes»— está en la otra pestaña. Separarlas obligaría a saber de antemano
 * en cuál está la respuesta, que es justo lo que no se sabe al venir a mirar.
 *
 * **Los filtros son de cada pestaña, no de la pantalla.** El historial acepta
 * estado y contacto; los consentimientos no aceptan ninguno de los dos. Una
 * barra común con controles que no hacen nada en la mitad de las vistas
 * enseñaría filtros que mienten.
 *
 * La política —si se escribe, a qué horas y con qué plantilla— vive en
 * Configuración: es un ajuste que se toca una vez, no trabajo diario.
 */
export function CollectionPage() {
  const { orgId } = useCurrentOrg()
  const can = useCan()
  const canRead = can('messaging.read')
  const canManage = can('messaging.settings.manage')

  const { values, set, clear } = useListFilters<Key>('nummo:cobranza:filtros', KEYS)
  const tab = (TABS.find((t) => t.value === values.vista)?.value ?? 'mensajes') as Tab
  const page = Number(values.pagina) || 1

  if (!canRead) {
    return (
      <div className="space-y-4">
        <PageHeader title="Cobranza por WhatsApp" />
        <EmptyState
          Icon={Lock}
          title="No puedes ver esto"
          description="Tu rol no incluye los mensajes de cobranza de esta organización."
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cobranza por WhatsApp"
        description="Lo que Nummo le ha escrito a quien te debe, y qué pasó con cada mensaje."
      >
        <Button asChild variant="outline">
          <Link to="/config/cobranza">
            <Settings2 className="size-4" />
            <span className="hidden sm:inline">Política</span>
          </Link>
        </Button>
      </PageHeader>

      <SegmentedControl
        aria-label="Qué se mira"
        options={TABS}
        value={tab}
        // Cambiar de pestaña suelta la página: la tres de una lista no es la
        // tres de la otra.
        onChange={(vista) => set({ vista, pagina: '' })}
      />

      {tab === 'mensajes' ? (
        <MessagesTab
          orgId={orgId}
          status={values.estado}
          contactId={values.contacto}
          page={page}
          onFilter={set}
          onClear={clear}
        />
      ) : (
        <ConsentsTab
          orgId={orgId}
          page={page}
          canManage={canManage}
          onPage={(next) => set({ pagina: next > 1 ? String(next) : '' })}
        />
      )}
    </div>
  )
}
