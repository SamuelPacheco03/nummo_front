import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { MessageCircleMore } from 'lucide-react'
import { ContactPicker } from '@/components/contact-picker'
import { Pagination } from '@/components/pagination'
import { Button } from '@/components/ui/button'
import { DataList } from '@/components/ui/data-list'
import { EmptyState, NoResults } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { FilterField, FilterSheet } from '@/components/ui/filter-sheet'
import { listColumns } from '@/components/ui/list-columns'
import { ListToolbar } from '@/components/ui/list-toolbar'
import { Note } from '@/components/ui/note'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatDateHuman, plural } from '@/lib/format'
import type {
  GetApiV1OrganizationsOrgIdMessagingMessagesParams,
  GetApiV1OrganizationsOrgIdMessagingMessagesStatus,
  OutboundMessage,
} from '@/api/generated/model'
import { useOutboundMessages } from './hooks'
import {
  MESSAGE_STATUSES,
  lastEvent,
  messageStatus,
  relatedAccountPath,
  skipReasonLabel,
  skipReasonOffersPlan,
} from './labels'

const PAGE_SIZE = 10

/**
 * Las fichas que se ven en móvil: las tres preguntas del día a día. El
 * desplegable de escritorio lleva los seis estados, que es donde se busca la
 * excepción (§21.1).
 */
const STATUS_CHIPS = [
  { value: '', label: 'Todos' },
  { value: 'SKIPPED', label: 'No se enviaron' },
  { value: 'FAILED', label: 'Fallaron' },
  { value: 'READ', label: 'Leídos' },
]

const column = listColumns<OutboundMessage>()

/**
 * **El historial: la pestaña de «¿por qué no le llegó?».**
 *
 * **Sin buscador ni cabeceras que ordenen**, y las dos ausencias son
 * deliberadas: el endpoint acepta `page`, `pageSize`, `status` y `contactId`, y
 * ni `q` ni `sort`. Una caja de búsqueda que no busca y una cabecera que no
 * ordena son promesas que el listado no puede cumplir (§18.1, reglas 2 y 3). Si
 * hicieran falta de verdad, son petición de contrato.
 */
export function MessagesTab({
  orgId,
  status,
  contactId,
  page,
  onFilter,
  onClear,
}: {
  orgId: string | undefined
  status: string
  contactId: string
  page: number
  onFilter: (patch: { estado?: string; contacto?: string; pagina?: string }) => void
  onClear: () => void
}) {
  const [sheetOpen, setSheetOpen] = useState(false)

  const params: GetApiV1OrganizationsOrgIdMessagingMessagesParams = {
    page,
    pageSize: PAGE_SIZE,
    status: (status || undefined) as GetApiV1OrganizationsOrgIdMessagingMessagesStatus,
    contactId: contactId || undefined,
  }
  const { items, total, totalPages, isPending, isError, error, isFetching } = useOutboundMessages(
    orgId,
    params,
  )

  const columns = useMemo(
    () =>
      column.columns([
        column.display({
          id: 'address',
          header: 'Destinatario',
          meta: { card: 'title' },
          cell: ({ row }) => (
            <div className="min-w-0">
              {/* El contrato no firma el nombre del contacto en esta vista, solo
                  su id: aquí el teléfono **es** lo que identifica al
                  destinatario, y no se inventa un nombre que no viene (§70). */}
              <p className="nums truncate font-medium">{row.original.address}</p>
              <p className="text-muted-foreground hidden truncate text-xs lg:block">
                {row.original.templateKey}
              </p>
            </div>
          ),
        }),
        column.display({
          id: 'templateKey',
          header: 'Plantilla',
          meta: { hideOnTable: true, card: 'meta' },
          cell: ({ row }) => row.original.templateKey,
        }),
        column.display({
          id: 'status',
          header: 'Estado',
          meta: { card: 'status' },
          cell: ({ row }) => <StatusBadge {...messageStatus(row.original.status)} />,
        }),
        column.display({
          id: 'reason',
          header: 'Qué pasó',
          meta: { label: 'Qué pasó' },
          cell: ({ row }) => <Outcome message={row.original} />,
        }),
        column.display({
          id: 'when',
          header: 'Cuándo',
          meta: { align: 'right', card: 'sub' },
          cell: ({ row }) => {
            const event = lastEvent(row.original)
            return (
              <span className="text-muted-foreground text-xs whitespace-nowrap">
                {event.label} {formatDateHuman(event.at)}
              </span>
            )
          },
        }),
      ]),
    [],
  )

  if (isError) {
    return <ErrorState error={error} fallback="No se pudieron cargar los mensajes." />
  }

  const hasFilters = Boolean(status || contactId)

  return (
    <div className="space-y-4">
      <ListToolbar
        main={{
          label: 'Estado',
          allLabel: 'Todos los estados',
          choices: STATUS_CHIPS,
          options: MESSAGE_STATUSES.map((value) => ({
            value,
            label: messageStatus(value).label,
          })),
          value: status,
          onChange: (estado) => onFilter({ estado, pagina: '' }),
        }}
        filterCount={contactId ? 1 : 0}
        onOpenFilters={() => setSheetOpen(true)}
      />

      <DataList
        columns={columns}
        rows={items}
        getRowId={(m) => m.id}
        isLoading={isPending}
        skeletonRows={PAGE_SIZE}
        emptyText={
          hasFilters ? (
            <NoResults entity="mensajes" onClear={onClear} />
          ) : (
            <EmptyState
              Icon={MessageCircleMore}
              title="Todavía no se le ha escrito a nadie"
              description="Con la política de cobranza encendida, cada aviso que Nummo mande al deudor aparece aquí."
              action={
                <Button asChild variant="outline">
                  <Link to="/config/cobranza">Ver la política</Link>
                </Button>
              }
            />
          )
        }
      />

      {!isPending && total > 0 && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          totalPages={totalPages}
          isFetching={isFetching}
          onPage={(next) => onFilter({ pagina: next > 1 ? String(next) : '' })}
        />
      )}

      {/* Quedarse en «Enviado» **no es un fallo**: las marcas de entregado y
          leído solo se llenan si el webhook de Meta está dado de alta. Sin
          decirlo, una columna llena de «Enviado» se lee como media entrega. */}
      <Note tone="info" title="«Enviado» puede ser el final del camino">
        Que un mensaje pase a entregado o leído depende de que Meta nos avise, y ese aviso no está
        activo en todos los despliegues. Un mensaje que se queda en enviado salió bien.
      </Note>

      <FilterSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onClear={onClear}
        canClear={hasFilters}
        resultLabel={`Ver ${plural(total, 'mensaje', 'mensajes')}`}
      >
        <FilterField
          label="Destinatario"
          hint="Solo los mensajes que se le escribieron a este contacto."
        >
          {orgId && (
            <ContactPicker
              orgId={orgId}
              label="Destinatario"
              value={contactId || null}
              onChange={(id) => onFilter({ contacto: id ?? '', pagina: '' })}
              allowClear
            />
          )}
        </FilterField>
      </FilterSheet>
    </div>
  )
}

/**
 * La respuesta a «¿por qué no le llegó?», que es a lo que se entra aquí.
 *
 * `SKIPPED` no lleva rojo: es «no se envió, a propósito», y su motivo es toda la
 * explicación. `FAILED` sí lo lleva, que ahí se intentó y se rompió algo.
 */
function Outcome({ message }: { message: OutboundMessage }) {
  const account = relatedAccountPath(message)

  if (message.status === 'SKIPPED') {
    return (
      <div className="min-w-0 space-y-0.5">
        <p className="text-muted-foreground text-xs">
          {message.skipReason ? skipReasonLabel(message.skipReason) : 'No se envió.'}
        </p>
        {/*
          El cupo es el único motivo con salida, y son dos: subir de plan o
          conectar número propio, que deja de gastarlo. **No hay recargas** —
          agotado es agotado hasta el próximo periodo—, así que el texto lo dice
          en vez de dejar esperando un botón de recarga que no existe.
        */}
        {skipReasonOffersPlan(message.skipReason) && (
          <p className="text-muted-foreground text-xs">
            No vuelve a salir hasta el próximo periodo.{' '}
            <Link to="/config/plan" className="text-brand underline">
              Ver planes
            </Link>{' '}
            ·{' '}
            <Link to="/config/whatsapp" className="text-brand underline">
              Usar tu número
            </Link>
          </p>
        )}
        {account && <AccountLink to={account} />}
      </div>
    )
  }

  if (message.status === 'FAILED') {
    return (
      <div className="min-w-0 space-y-0.5">
        <p className="text-destructive text-xs">{message.lastError ?? 'No se pudo enviar.'}</p>
        {account && <AccountLink to={account} />}
      </div>
    )
  }

  return account ? <AccountLink to={account} /> : <span className="text-muted-foreground">—</span>
}

function AccountLink({ to }: { to: string }) {
  return (
    <Link to={to} className="text-brand block text-xs underline">
      Ver la cuenta
    </Link>
  )
}
