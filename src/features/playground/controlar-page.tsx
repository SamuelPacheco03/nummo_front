import { PageHeader } from '@/components/page-header'
import { PlatformPage } from '@/features/admin/platform-page'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { useListFilters } from '@/lib/use-list-filters'
import { KnowledgeTab } from './knowledge-tab'
import { ToolsTab } from './tools-tab'
import { WritesTab } from './writes-tab'

/**
 * **Controlar**: qué puede hacer Numi, qué dejó hecho y con qué material lo hizo.
 *
 * Las tres pestañas se miran para lo mismo —entender de dónde salió una respuesta— pero a
 * distinta profundidad: **Herramientas** dice qué se le ofrece al modelo y por qué no el
 * resto, **Escrituras** qué registró de verdad una conversación, y **Conocimiento** qué le
 * devuelve la base cuando pregunta.
 *
 * Es la mitad de consulta del playground: aquí no se conversa, se comprueba.
 */

const KEYS = ['vista'] as const
type Key = (typeof KEYS)[number]

type Tab = 'herramientas' | 'escrituras' | 'conocimiento'

const TABS: { value: Tab; label: string }[] = [
  { value: 'herramientas', label: 'Herramientas' },
  { value: 'escrituras', label: 'Escrituras' },
  { value: 'conocimiento', label: 'Conocimiento' },
]

export function PlaygroundControlarPage() {
  const { values, set } = useListFilters<Key>('nummo:playground:controlar', KEYS)
  const tab = (TABS.find((t) => t.value === values.vista)?.value ?? 'herramientas') as Tab

  return (
    <PlatformPage>
        <PageHeader
          title="Controlar"
          description="Qué herramientas ve Numi con este rol y este modo, qué dejó escrito una conversación, y qué conocimiento respalda sus respuestas."
        />

        <SegmentedControl
          aria-label="Qué se mira"
          options={TABS}
          value={tab}
          onChange={(vista) => set({ vista })}
        />

        <div className="pb-2">
          {tab === 'herramientas' && <ToolsTab />}
          {tab === 'escrituras' && <WritesTab />}
          {tab === 'conocimiento' && <KnowledgeTab />}
        </div>
    </PlatformPage>
  )
}
