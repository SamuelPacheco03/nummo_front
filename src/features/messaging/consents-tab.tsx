import { useMemo, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Pagination } from '@/components/pagination'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataList } from '@/components/ui/data-list'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Note } from '@/components/ui/note'
import { StatusBadge } from '@/components/ui/status-badge'
import { toastApiError } from '@/features/platform/errors'
import { formatDateHuman } from '@/lib/format'
import { listColumns } from '@/components/ui/list-columns'
import type { MessageConsent } from '@/api/generated/model'
import { useMessageConsents, useSetMessageConsent } from './hooks'
import { consentSourceLabel, consentStatus } from './labels'

const PAGE_SIZE = 10

const column = listColumns<MessageConsent>()

/**
 * **Quién puede recibir la cobranza.**
 *
 * La regla que hay que entender antes de leer esta pantalla: **`UNKNOWN` deja
 * pasar los mensajes.** A un cliente al que se le factura no se le pide permiso
 * para cobrarle —Meta solo exige consentimiento explícito para `MARKETING`, y
 * estas plantillas son `UTILITY`—, así que no es un estado pendiente que haya
 * que resolver.
 *
 * De ahí que la columna se llame «Puede recibir» y no «Consentimiento», y que
 * `UNKNOWN` y `GRANTED` compartan tono: lo que se enseña es **el efecto**, que
 * es lo que alguien viene a comprobar. Pintar `UNKNOWN` de ámbar, con un aviso
 * de «falta confirmar», sería mentir sobre lo que hace el sistema y empujar a
 * perseguir permisos que nadie necesita.
 *
 * `REVOKED` es el único que bloquea, y se comprueba **al encolar**.
 *
 * **Sin filtros ni orden**: el endpoint solo acepta `page` y `pageSize`, y una
 * barra de criterios que el API no admite es la promesa incumplida de §18.1.
 */
export function ConsentsTab({
  orgId,
  page,
  canManage,
  onPage,
}: {
  orgId: string | undefined
  page: number
  canManage: boolean
  onPage: (page: number) => void
}) {
  const { items, total, totalPages, isPending, isError, error, isFetching } = useMessageConsents(
    orgId,
    { page, pageSize: PAGE_SIZE },
  )
  const save = useSetMessageConsent(orgId ?? '')
  const [blocking, setBlocking] = useState<MessageConsent | null>(null)

  const setStatus = async (consent: MessageConsent, status: 'GRANTED' | 'REVOKED') => {
    if (!orgId) return
    try {
      await save.mutateAsync({
        orgId,
        data: {
          address: consent.address,
          channel: consent.channel,
          status,
          // Lo puso alguien de la organización a mano, que es lo único que
          // puede pasar desde esta pantalla.
          source: 'MANUAL',
          contactId: consent.contactId,
        },
      })
      toast.success(status === 'REVOKED' ? 'No se le volverá a escribir' : 'Puede recibir de nuevo')
      setBlocking(null)
    } catch (err) {
      toastApiError(err, 'No se pudo cambiar el consentimiento')
    }
  }

  const columns = useMemo(
    () =>
      column.columns([
        column.display({
          id: 'address',
          header: 'Teléfono',
          meta: { card: 'title' },
          cell: ({ row }) => <span className="nums font-medium">{row.original.address}</span>,
        }),
        column.display({
          id: 'status',
          header: 'Puede recibir',
          meta: { card: 'status' },
          cell: ({ row }) => <StatusBadge {...consentStatus(row.original.status)} />,
        }),
        column.display({
          id: 'why',
          header: 'Por qué',
          meta: { label: 'Por qué' },
          cell: ({ row }) => (
            <span className="text-muted-foreground text-xs">
              {consentStatus(row.original.status).hint}
            </span>
          ),
        }),
        column.display({
          id: 'source',
          header: 'Origen',
          meta: { card: 'meta' },
          cell: ({ row }) => (
            <span className="text-muted-foreground text-xs">
              {consentSourceLabel(row.original.source)} · {formatDateHuman(row.original.updatedAt)}
            </span>
          ),
        }),
        column.display({
          id: 'action',
          header: '',
          meta: { hideOnStack: false, label: '' },
          cell: ({ row }) =>
            canManage ? (
              row.original.status === 'REVOKED' ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={save.isPending}
                  onClick={() => void setStatus(row.original, 'GRANTED')}
                >
                  Permitir de nuevo
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setBlocking(row.original)}>
                  No escribirle
                </Button>
              )
            ) : null,
        }),
      ]),
    // `setStatus` se recrea cada render y volvería a construir las columnas
    // siempre; lo que de verdad cambia lo que se dibuja es el permiso y si hay
    // una escritura en vuelo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canManage, save.isPending],
  )

  if (isError) {
    return <ErrorState error={error} fallback="No se pudieron cargar los consentimientos." />
  }

  return (
    <div className="space-y-4">
      {/* Lo primero que hay que leer, porque es contraintuitivo y decide cómo se
          interpreta la tabla entera. */}
      <Note tone="info" title="Cobrar no necesita permiso">
        A quien se le factura se le puede escribir para cobrarle: son mensajes de servicio, no
        publicidad. Aquí solo se registra a quien pidió expresamente que no se le escriba.
      </Note>

      <DataList
        columns={columns}
        rows={items}
        getRowId={(c) => `${c.channel}:${c.address}`}
        isLoading={isPending}
        skeletonRows={PAGE_SIZE}
        emptyText={
          <EmptyState
            Icon={ShieldCheck}
            title="Nadie ha pedido que no se le escriba"
            description="Mientras esté así, la cobranza le llega a todos los deudores con teléfono."
          />
        }
      />

      {!isPending && total > 0 && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          totalPages={totalPages}
          isFetching={isFetching}
          onPage={onPage}
        />
      )}

      <ConfirmDialog
        open={blocking != null}
        onOpenChange={(open) => !open && setBlocking(null)}
        title="Dejar de escribirle"
        description={
          blocking
            ? `No se le encolará ningún mensaje de cobranza a ${blocking.address} mientras siga así. La deuda no cambia: solo se deja de avisar por WhatsApp.`
            : undefined
        }
        confirmLabel="Dejar de escribirle"
        destructive
        loading={save.isPending}
        onConfirm={() => blocking && void setStatus(blocking, 'REVOKED')}
      />
    </div>
  )
}
