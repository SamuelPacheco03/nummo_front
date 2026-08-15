import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Download } from 'lucide-react'
import { Pagination } from '@/components/pagination'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/data-table'
import { NativeSelect } from '@/components/ui/native-select'
import { downloadCsv } from '@/lib/csv'
import { formatAmount, formatDateHuman } from '@/lib/format'
import { cn } from '@/lib/utils'

type Tone = 'success' | 'warning' | 'destructive' | 'muted'
const DOT: Record<Tone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  muted: 'bg-muted-foreground/40',
}

export type DueRow = {
  id: string
  name: string
  dueDate: string
  balance: string
  currency?: string
  isOverdue: boolean
  statusLabel: string
  tone: Tone
  href: string
}

type Filter = 'all' | 'overdue' | 'upcoming'

const PAGE_SIZE = 8

function StatusChip({ row }: { row: DueRow }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm">
      <span className={cn('size-1.5 rounded-full', DOT[row.tone])} />
      {row.statusLabel}
    </span>
  )
}

/**
 * Panel de cuentas pendientes (por cobrar o por pagar): tabla/tarjetas ordenadas
 * por vencimiento (lo más urgente primero), con filtro por estado, total y CSV.
 * Mobile-first: en móvil cada cuenta es una tarjeta (via `DataTable`).
 */
export function PendingDuesPanel({
  title,
  nameHeader,
  rows,
  csvFile,
  currency,
  emptyLabel,
}: {
  title: string
  nameHeader: string
  rows: DueRow[]
  csvFile: string
  currency?: string
  emptyLabel: string
}) {
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => {
    const f =
      filter === 'all' ? rows : filter === 'overdue' ? rows.filter((r) => r.isOverdue) : rows.filter((r) => !r.isOverdue)
    return [...f].sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0))
  }, [rows, filter])

  const total = filtered.reduce((s, r) => s + (Number(r.balance) || 0), 0)
  const overdueCount = rows.filter((r) => r.isOverdue).length

  const [page, setPage] = useState(1)
  useEffect(() => setPage(1), [filter])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const onExport = () =>
    downloadCsv(
      csvFile,
      [nameHeader, 'Vence', 'Estado', 'Saldo'],
      filtered.map((r) => [r.name, r.dueDate, r.statusLabel, r.balance]),
    )

  const columns: Column<DueRow>[] = [
    {
      header: 'Vence',
      cell: (r) => (
        <Link to={r.href} className="hover:underline">
          {formatDateHuman(r.dueDate)}
        </Link>
      ),
      className: 'nums whitespace-nowrap',
    },
    { header: nameHeader, cell: (r) => r.name, className: 'max-w-[12rem] truncate' },
    { header: 'Estado', cell: (r) => <StatusChip row={r} /> },
    {
      header: 'Saldo',
      cell: (r) => formatAmount(r.balance, r.currency ?? currency),
      className: 'nums text-right font-medium',
      headClassName: 'text-right',
    },
  ]

  const renderCard = (r: DueRow) => (
    <Link to={r.href} className="block space-y-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate font-medium">{r.name}</span>
        <span className="nums shrink-0 font-medium">{formatAmount(r.balance, r.currency ?? currency)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className="nums">Vence {formatDateHuman(r.dueDate)}</span>
        <span aria-hidden>·</span>
        <StatusChip row={r} />
      </div>
    </Link>
  )

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h2>
        <div className="flex items-center gap-2">
          <NativeSelect
            aria-label="Filtrar por estado"
            className="h-8 w-auto"
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
          >
            <option value="all">Todas</option>
            <option value="overdue">Vencidas</option>
            <option value="upcoming">Por vencer</option>
          </NativeSelect>
          <Button variant="outline" size="sm" onClick={onExport} disabled={filtered.length === 0}>
            <Download className="size-4" />
            CSV
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={paged}
        getKey={(r) => r.id}
        renderCard={renderCard}
        emptyText={rows.length === 0 ? emptyLabel : 'Nada en este filtro.'}
      />

      {filtered.length > 0 && (
        <div className="flex items-center justify-between gap-2 px-1 text-sm">
          <span className="text-muted-foreground">
            {filtered.length} cuenta(s)
            {filter === 'all' && overdueCount > 0 ? ` · ${overdueCount} vencida(s)` : ''}
          </span>
          <span className="nums font-medium">Total: {formatAmount(total.toFixed(2), currency)}</span>
        </div>
      )}

      {filtered.length > PAGE_SIZE && (
        <Pagination
          page={safePage}
          pageSize={PAGE_SIZE}
          total={filtered.length}
          totalPages={totalPages}
          onPage={setPage}
        />
      )}
    </section>
  )
}
