import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Download } from 'lucide-react'
import { Pagination } from '@/components/pagination'
import { Button } from '@/components/ui/button'
import { DataList } from '@/components/ui/data-list'
import { listColumns } from '@/components/ui/list-columns'
import { NativeSelect } from '@/components/ui/native-select'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { downloadCsv } from '@/lib/csv'
import { formatAmount, formatDateHuman, plural } from '@/lib/format'

export type DueRow = {
  id: string
  name: string
  dueDate: string
  balance: string
  currency?: string
  isOverdue: boolean
  statusLabel: string
  tone: StatusTone
  href: string
}

type Filter = 'all' | 'overdue' | 'upcoming'

const PAGE_SIZE = 8

/** Estable entre renders: la fábrica no depende de nada del componente. */
const column = listColumns<DueRow>()

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
  const navigate = useNavigate()
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

  const columns = useMemo(
    () =>
      column.columns([
        column.display({
          id: 'name',
          header: nameHeader,
          cell: ({ row }) => <span className="truncate font-medium">{row.original.name}</span>,
        }),
        column.display({
          id: 'dueDate',
          header: 'Vence',
          cell: ({ row }) => (
            <span className="nums text-muted-foreground whitespace-nowrap">
              {formatDateHuman(row.original.dueDate)}
            </span>
          ),
        }),
        column.display({
          id: 'status',
          header: 'Estado',
          cell: ({ row }) => <StatusBadge tone={row.original.tone} label={row.original.statusLabel} />,
        }),
        column.display({
          id: 'balance',
          header: 'Saldo',
          meta: { align: 'right' },
          cell: ({ row }) => formatAmount(row.original.balance, row.original.currency ?? currency),
        }),
      ]),
    [nameHeader, currency],
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

      <DataList
        columns={columns}
        rows={paged}
        getRowId={(r) => r.id}
        onRowClick={(r) => navigate(r.href)}
        emptyText={rows.length === 0 ? emptyLabel : 'Nada en este filtro.'}
      />

      {filtered.length > 0 && (
        <div className="flex items-center justify-between gap-2 px-1 text-sm">
          <span className="text-muted-foreground">
            {plural(filtered.length, 'cuenta', 'cuentas')}
            {filter === 'all' && overdueCount > 0 ? ` · ${plural(overdueCount, 'vencida', 'vencidas')}` : ''}
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
