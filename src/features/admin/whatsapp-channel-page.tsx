import { PageHeader } from '@/components/page-header'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { useListFilters } from '@/lib/use-list-filters'
import { PlatformPage } from './platform-page'
import { WhatsAppInboundTab } from './whatsapp-inbound-tab'
import { WhatsAppTemplatesTab } from './whatsapp-templates-tab'

const KEYS = ['vista'] as const
type Key = (typeof KEYS)[number]

type Tab = 'entrantes' | 'plantillas'

const TABS: { value: Tab; label: string }[] = [
  { value: 'entrantes', label: 'Entrantes' },
  { value: 'plantillas', label: 'Plantillas' },
]

/**
 * **El canal de WhatsApp, visto por Nummo.**
 *
 * Es la otra mitad de lo que ve una organización de su cobranza (§11.1.16): allí
 * está lo suyo, aquí lo que no es de nadie. Vive en la consola de plataforma y
 * **fuera de `requireTenant`** — no hay `orgId` porque estas dos cosas no
 * pertenecen a ninguna organización.
 *
 * Dos pestañas y no dos destinos, porque las dos responden la misma pregunta —«¿el
 * canal está sano?»— y comparten el patrón que las hace necesarias: **el fallo
 * pasa en un sitio y el síntoma aparece en otro.** Un webhook que deja de
 * parsearse o una plantilla que Meta pausa se ven aquí como lo que son; en el
 * cliente se ven como «mis mensajes se quedan en enviado» o como un mensaje
 * saltado suelto, y nadie ata una cosa con la otra.
 */
export function WhatsAppChannelPage() {
  const { values, set } = useListFilters<Key>('nummo:plataforma:canal', KEYS)
  const tab = (TABS.find((t) => t.value === values.vista)?.value ?? 'entrantes') as Tab

  return (
    <PlatformPage>
      <PageHeader
        title="Canal de WhatsApp"
        description="Lo que Meta entrega a este despliegue y las plantillas que comparten todos los clientes."
      />

      <SegmentedControl
        aria-label="Qué se mira"
        options={TABS}
        value={tab}
        onChange={(vista) => set({ vista })}
      />

      {tab === 'entrantes' ? <WhatsAppInboundTab /> : <WhatsAppTemplatesTab />}
    </PlatformPage>
  )
}
