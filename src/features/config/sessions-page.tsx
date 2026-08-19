import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useRevokeOtherSessions, useRevokeSession, useSessions } from '@/features/auth/hooks'
import { getErrorMessage } from '@/lib/errors'
import { toastApiError } from '@/features/platform/errors'
import { formatDateHuman } from '@/lib/format'

/** Etiqueta amable del dispositivo a partir del user-agent. */
function deviceLabel(ua: string | null): string {
  if (!ua) return 'Dispositivo desconocido'
  const browser = /Edg/.test(ua)
    ? 'Edge'
    : /OPR|Opera/.test(ua)
      ? 'Opera'
      : /Chrome/.test(ua)
        ? 'Chrome'
        : /Firefox/.test(ua)
          ? 'Firefox'
          : /Safari/.test(ua)
            ? 'Safari'
            : 'Navegador'
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad|iPod/.test(ua)
        ? 'iOS'
        : /Macintosh|Mac OS X/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : ''
  return os ? `${browser} · ${os}` : browser
}

export function SessionsPage() {
  const { sessions, isPending, isError, error } = useSessions()
  const revoke = useRevokeSession()
  const revokeOthers = useRevokeOtherSessions()
  const [confirmOthers, setConfirmOthers] = useState(false)

  const others = sessions.filter((s) => !s.current).length

  const onRevoke = async (id: string) => {
    try {
      await revoke.mutateAsync({ id })
      toast.success('Sesión cerrada')
    } catch (err) {
      toastApiError(err, 'No se pudo cerrar la sesión')
    }
  }

  const onRevokeOthers = async () => {
    try {
      await revokeOthers.mutateAsync()
      setConfirmOthers(false)
      toast.success('Se cerraron las demás sesiones')
    } catch (err) {
      toastApiError(err, 'No se pudieron cerrar')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Sesiones" description="Dispositivos donde tu cuenta tiene la sesión abierta.">
        {others > 0 && (
          <Button variant="outline" size="sm" onClick={() => setConfirmOthers(true)}>
            Cerrar las demás
          </Button>
        )}
      </PageHeader>

      {isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : isError ? (
        <p className="text-sm text-destructive">
          {getErrorMessage(error, 'No se pudieron cargar las sesiones.')}
        </p>
      ) : (
        <Card className="gap-0 py-0">
          <ul className="divide-y">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{deviceLabel(s.userAgent)}</span>
                    {s.current && (
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                        Esta sesión
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.ipAddress ?? 'IP desconocida'} · inició {formatDateHuman(s.createdAt)} · expira{' '}
                    {formatDateHuman(s.expiresAt)}
                  </div>
                </div>
                {!s.current && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={revoke.isPending}
                    onClick={() => onRevoke(s.id)}
                  >
                    {revoke.isPending && <Loader size="sm" />}
                    Cerrar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ConfirmDialog
        open={confirmOthers}
        onOpenChange={setConfirmOthers}
        title="Cerrar las demás sesiones"
        description="Se cerrará la sesión en todos los otros dispositivos. Esta seguirá abierta."
        confirmLabel="Cerrar las demás"
        destructive
        loading={revokeOthers.isPending}
        onConfirm={onRevokeOthers}
      />
    </div>
  )
}
