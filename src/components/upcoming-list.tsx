import { Link } from 'react-router'
import { formatMoney, formatDateHuman } from '@/lib/format'

/**
 * Lista compacta de próximos vencimientos: nombre → fecha → monto. Usada por
 * "Próximas a vencer" y "Próximos pagos" en el Panel e Informes.
 */
export function UpcomingList({
  items,
  currency,
  emptyLabel,
}: {
  items: { id: string; href: string; name: string; dueDate: string; amount: string }[]
  currency?: string
  emptyLabel: string
}) {
  if (items.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">{emptyLabel}</p>
  }
  return (
    <ul className="divide-y">
      {items.map((u) => (
        <li key={u.id} className="flex items-center justify-between gap-2 py-2 text-sm">
          <Link to={u.href} className="min-w-0 flex-1 truncate hover:underline">
            {u.name}
          </Link>
          <span className="nums shrink-0 text-xs text-muted-foreground">{formatDateHuman(u.dueDate)}</span>
          <span className="nums shrink-0 font-medium">{formatMoney(u.amount, currency)}</span>
        </li>
      ))}
    </ul>
  )
}
