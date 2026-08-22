import { useState } from 'react'
import { RefreshCcw, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Pagination } from '@/components/pagination'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Loader } from '@/components/ui/loader'
import { NativeSelect } from '@/components/ui/native-select'
import { Note } from '@/components/ui/note'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { toastApiError } from '@/features/platform/errors'
import { formatRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type {
  AdminInboundEvent,
  GetApiV1AdminWhatsappInboundEventsStatus,
  InboundQueueHealth,
  Requeued,
} from '@/api/generated/model'
import {
  useInboundEvents,
  useInboundHealth,
  useRetryFailedInboundEvents,
  useRetryInboundEvent,
} from './hooks'

const PAGE_SIZE = 20

const STATES: { value: GetApiV1AdminWhatsappInboundEventsStatus; label: string; tone: StatusTone }[] =
  [
    { value: 'PENDING', label: 'En espera', tone: 'warning' },
    { value: 'PROCESSED', label: 'Procesadas', tone: 'success' },
    { value: 'FAILED', label: 'Fallidas', tone: 'destructive' },
  ]

function stateOf(status: string): { label: string; tone: StatusTone } {
  return STATES.find((s) => s.value === status) ?? { label: status, tone: 'muted' }
}

/**
 * **La cola de entrantes de WhatsApp.**
 *
 * Lo que Meta entrega al webhook, y si se está procesando. Es la única tabla del
 * canal sin dueño —cuando llega una entrega todavía no se sabe de qué
 * organización es—, así que solo se puede mirar desde aquí.
 *
 * **`FAILED` creciendo es la alarma**, no una columna más: significa que Meta
 * está mandando algo que este despliegue ya no sabe leer, y el síntoma que ve el
 * cliente es «mis mensajes se quedan en enviado». Nadie ata una cosa con la otra
 * si esta pantalla no existe.
 */
export function WhatsAppInboundTab() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [retryAllOpen, setRetryAllOpen] = useState(false)

  const { health, isPending: healthPending } = useInboundHealth()
  const { events, total, totalPages, isPending, isError, error, isFetching } = useInboundEvents({
    page,
    pageSize: PAGE_SIZE,
    status: (status || undefined) as GetApiV1AdminWhatsappInboundEventsStatus,
  })
  const retryOne = useRetryInboundEvent()
  const retryAll = useRetryFailedInboundEvents()

  const onRetryOne = async (event: AdminInboundEvent) => {
    try {
      await retryOne.mutateAsync({ id: event.id })
      toast.success('Vuelve a la cola', {
        description: 'Se reintenta desde cero; la procesa el worker en su siguiente vuelta.',
      })
    } catch (err) {
      toastApiError(err, 'No se pudo reencolar')
    }
  }

  const onRetryAll = async () => {
    try {
      const response = await retryAll.mutateAsync()
      const { requeued } = response.data as Requeued
      toast.success(
        requeued === 0 ? 'No había nada fallido que reencolar' : `${requeued} vuelven a la cola`,
        { description: requeued > 0 ? 'Las procesa el worker en su siguiente vuelta.' : undefined },
      )
      setRetryAllOpen(false)
    } catch (err) {
      toastApiError(err, 'No se pudieron reencolar')
    }
  }

  return (
    <div className="space-y-4">
      {healthPending ? (
        <Skeleton className="h-20 w-full" />
      ) : (
        health && <Health health={health} onPick={(s) => (setStatus(s), setPage(1))} active={status} />
      )}

      {isError ? (
        <ErrorState error={error} fallback="No se pudo cargar la cola." />
      ) : (
        <Panel
          title="Entregas de Meta"
          action={
            <div className="flex items-center gap-2">
              <NativeSelect
                className="w-40"
                aria-label="Estado"
                value={status}
                onChange={(e) => (setStatus(e.target.value), setPage(1))}
              >
                <option value="">Todos los estados</option>
                {STATES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </NativeSelect>
              {(health?.FAILED ?? 0) > 0 && (
                <Button variant="outline" size="sm" onClick={() => setRetryAllOpen(true)}>
                  <RefreshCcw aria-hidden className="size-4" />
                  Reencolar las fallidas
                </Button>
              )}
            </div>
          }
        >
          {isPending ? (
            <Skeleton className="h-48 w-full" />
          ) : events.length === 0 ? (
            <EmptyState
              Icon={RefreshCcw}
              title={status ? 'Nada con ese estado' : 'La cola está vacía'}
              description={
                status
                  ? 'Prueba con otro estado.'
                  : 'Aquí aparece lo que Meta entrega al webhook: estados de entrega y bajas.'
              }
            />
          ) : (
            <ul className="divide-y">
              {events.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  busy={retryOne.isPending}
                  onRetry={() => void onRetryOne(event)}
                />
              ))}
            </ul>
          )}

          {!isPending && total > 0 && (
            <div className="pt-3">
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                totalPages={totalPages}
                isFetching={isFetching}
                onPage={setPage}
              />
            </div>
          )}
        </Panel>
      )}

      {/* Se dice una vez, porque es lo que se pregunta al ver la tabla. */}
      <Note tone="info" title="Aquí no está el contenido de los mensajes">
        Lo que Meta entrega lleva teléfonos de deudores —gente que ni siquiera usa Nummo—, así que
        de cada entrega se guarda qué clase de evento era y por qué falló, nunca el cuerpo.
      </Note>

      <ConfirmDialog
        open={retryAllOpen}
        onOpenChange={setRetryAllOpen}
        title="Reencolar todas las fallidas"
        description="Vuelven a la cola con los intentos a cero y las procesa el worker en su siguiente vuelta. Hazlo cuando ya hayas arreglado lo que las rompía; si no, volverán a fallar."
        confirmLabel="Reencolar"
        loading={retryAll.isPending}
        onConfirm={() => void onRetryAll()}
      />
    </div>
  )
}

/**
 * Los tres estados, **siempre los tres y aunque estén en cero**. Un «FAILED: —»
 * hace dudar de si es que no hay o es que no se pudo contar, y esta pantalla
 * existe justamente para quitar esa duda.
 *
 * Pulsar uno filtra la tabla: el conteo y la lista son la misma pregunta a dos
 * escalas.
 */
function Health({
  health,
  active,
  onPick,
}: {
  health: InboundQueueHealth
  active: string
  onPick: (status: string) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {STATES.map(({ value, label }) => {
        const count = health[value]
        // `FAILED` creciendo no es «algunos webhooks raros»: es que Meta manda
        // algo que este despliegue ya no sabe leer. Merece destacarse.
        const alarming = value === 'FAILED' && count > 0
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active === value}
            onClick={() => onPick(active === value ? '' : value)}
            className={cn(
              'bg-card rounded-lg border p-4 text-left transition-colors',
              active === value ? 'border-brand' : 'hover:bg-accent',
              alarming && 'border-destructive/40',
            )}
          >
            <p className="text-muted-foreground text-sm">{label}</p>
            <p
              className={cn('nums font-display text-2xl font-semibold', alarming && 'text-destructive')}
            >
              {count}
            </p>
            {alarming && (
              <p className="text-destructive text-xs">Meta manda algo que ya no sabemos leer.</p>
            )}
          </button>
        )
      })}
    </div>
  )
}

function EventRow({
  event,
  busy,
  onRetry,
}: {
  event: AdminInboundEvent
  busy: boolean
  onRetry: () => void
}) {
  const state = stateOf(event.status)
  const fields = event.shape.fields

  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-3">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge {...state} />
          {/*
            `shape.fields` es la herramienta de diagnóstico: si todos los fallidos
            son del mismo campo, el problema está en ese camino y no en el canal.
          */}
          <span className="nums text-muted-foreground text-xs">
            {fields.length > 0 ? fields.join(', ') : 'sin campos'}
            {event.shape.entries !== 1 && ` · ${event.shape.entries} entradas`}
          </span>
        </div>
        <p className="text-muted-foreground text-xs">
          {event.phoneNumberId ? `Número ${event.phoneNumberId}` : 'Sin número'} ·{' '}
          {formatRelativeTime(event.receivedAt)}
          {event.attempts > 0 && ` · ${event.attempts} intentos`}
        </p>
        {event.lastError && <p className="text-destructive text-xs">{event.lastError}</p>}
      </div>

      {/* Solo lo fallido es reencolable: pedirlo sobre una procesada responde 404,
          así que el botón no se ofrece donde no puede funcionar (§70). */}
      {event.status === 'FAILED' && (
        <Button variant="ghost" size="sm" disabled={busy} onClick={onRetry}>
          {busy ? <Loader className="size-4" /> : <RotateCcw aria-hidden className="size-4" />}
          Reencolar
        </Button>
      )}
    </li>
  )
}
