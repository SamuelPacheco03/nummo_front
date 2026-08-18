import { Download, Wallet } from 'lucide-react'
import type { AccountReport } from '@/api/generated/model'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { Chart } from '@/components/ui/chart'
import { EmptyState } from '@/components/ui/empty-state'
import { ACCOUNT_TYPE_LABELS } from '@/features/masters/labels'
import { downloadCsv } from '@/lib/csv'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'

const num = (v: string) => Number(v) || 0

/**
 * Una cuenta, en una línea: **lo que tiene** a la derecha y lo que entró y salió
 * debajo.
 *
 * El saldo es de siempre y el movimiento es del período, que son dos preguntas
 * distintas — por eso el saldo va grande y en su columna, y el movimiento en la
 * línea de contexto con los signos y los colores que ya usa Actividad reciente.
 * Mezclarlos en una sola cifra sería más limpio y no querría decir nada.
 */
export function AccountRows({
  accounts,
  className,
}: {
  accounts: AccountReport[]
  className?: string
}) {
  if (accounts.length === 0) {
    return (
      <EmptyState
        Icon={Wallet}
        title="Todavía no hay cuentas"
        description="Crea una caja o una cuenta de banco para empezar a registrar movimientos."
        className="py-6"
      />
    )
  }

  return (
    <ul className={cn('divide-y', className)}>
      {accounts.map((a) => (
        <li key={a.accountId} className="flex items-center gap-3 py-2.5 text-sm">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">{a.name}</span>
              {!a.isActive && (
                <span className="text-muted-foreground shrink-0 text-xs">· archivada</span>
              )}
            </div>
            <div className="text-muted-foreground truncate text-xs">
              {ACCOUNT_TYPE_LABELS[a.accountType] ?? a.accountType}
              {a.movements > 0 ? (
                <>
                  {' · '}
                  <span className="text-success-strong">+ {formatMoney(a.inflow, a.currency)}</span>
                  {' · '}
                  <span className="text-destructive">− {formatMoney(a.outflow, a.currency)}</span>
                </>
              ) : (
                ' · sin movimientos en el período'
              )}
            </div>
          </div>
          <span className="nums shrink-0 font-medium">{formatMoney(a.balance, a.currency)}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * El informe completo de caja: cuánto entró y cuánto salió por cuenta en el
 * período, y con qué saldo quedó cada una.
 *
 * Las barras van **por cuenta y no por mes**: el flujo mensual ya lo cuenta el
 * gráfico de arriba, y lo que esta sección responde es de dónde salió y a dónde
 * entró el dinero. El CSV lleva además el número de movimientos, que en la
 * gráfica no cabe.
 */
export function AccountsReport({
  accounts,
  currency,
  csvFile,
}: {
  accounts: AccountReport[]
  currency?: string
  csvFile: string
}) {
  const moved = accounts.filter((a) => a.movements > 0)
  const totalIn = accounts.reduce((s, a) => s + num(a.inflow), 0)
  const totalOut = accounts.reduce((s, a) => s + num(a.outflow), 0)

  const onExport = () =>
    downloadCsv(
      csvFile,
      ['Cuenta', 'Tipo', 'Moneda', 'Saldo', 'Entradas', 'Salidas', 'Movimientos'],
      accounts.map((a) => [
        a.name,
        ACCOUNT_TYPE_LABELS[a.accountType] ?? a.accountType,
        a.currency,
        a.balance,
        a.inflow,
        a.outflow,
        String(a.movements),
      ]),
    )

  return (
    <Panel
      title="Cuentas · saldo y movimiento"
      action={
        <Button variant="outline" size="sm" onClick={onExport} disabled={accounts.length === 0}>
          <Download className="size-4" />
          CSV
        </Button>
      }
    >
      <div className="space-y-4">
        <Chart
          data={moved.map((a) => ({
            cuenta: a.name,
            entradas: num(a.inflow),
            salidas: num(a.outflow),
          }))}
          x="cuenta"
          series={[
            { key: 'entradas', label: 'Entradas', tone: 'success' },
            { key: 'salidas', label: 'Salidas', tone: 'destructive' },
          ]}
          currency={currency}
          empty="Ninguna cuenta se movió en el período."
        />
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border p-3">
            <dt className="text-muted-foreground text-xs">Entró en el período</dt>
            <dd className="nums text-success-strong font-medium">
              {formatMoney(totalIn, currency)}
            </dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-muted-foreground text-xs">Salió en el período</dt>
            <dd className="nums text-destructive font-medium">{formatMoney(totalOut, currency)}</dd>
          </div>
        </dl>
        <AccountRows accounts={accounts} />
      </div>
    </Panel>
  )
}
