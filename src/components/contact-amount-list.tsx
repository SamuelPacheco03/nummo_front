import { Link } from 'react-router'
import { formatAmount } from '@/lib/format'

/**
 * Lista compacta contacto → monto vencido (en rojo). Usada por "Top deudores"
 * y "Top acreedores" en el Panel e Informes.
 */
export function ContactAmountList({
  items,
  currency,
  emptyLabel,
}: {
  items: { id: string; name: string; amount: string }[]
  currency?: string
  emptyLabel: string
}) {
  if (items.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">{emptyLabel}</p>
  }
  return (
    <ul className="divide-y">
      {items.map((i) => (
        <li key={i.id} className="flex items-center justify-between gap-2 py-2 text-sm">
          <Link to={`/contactos/${i.id}`} className="truncate hover:underline">
            {i.name}
          </Link>
          <span className="nums font-medium text-destructive">{formatAmount(i.amount, currency)}</span>
        </li>
      ))}
    </ul>
  )
}
