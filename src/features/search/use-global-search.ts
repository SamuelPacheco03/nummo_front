import { useMemo } from 'react'
import { Banknote, Coins, HandCoins, Users, type LucideIcon } from 'lucide-react'
import { useContacts } from '@/features/contacts/hooks'
import { useReceivables } from '@/features/receivables/hooks'
import { useExpenses } from '@/features/expenses/hooks'
import { usePayments } from '@/features/payments/hooks'
import { useDisbursements } from '@/features/expenses/hooks'
import { receivableStatus } from '@/features/receivables/labels'
import { expenseStatus } from '@/features/expenses/labels'
import { formatDateHuman, formatMoney } from '@/lib/format'
import type { StatusTone } from '@/components/ui/status-badge'

/** Documento legible de un contacto: «CC 1.020.334». */
const documentText = (c: { documentType: string | null; documentNumber: string | null }) =>
  [c.documentType, c.documentNumber].filter(Boolean).join(' ')

/** Cuántos resultados por tipo. Tres caben sin que un tipo tape a los demás. */
const PER_TYPE = 3

export type ResultKind = 'contact' | 'receivable' | 'expense' | 'payment' | 'disbursement'

export interface SearchHit {
  id: string
  kind: ResultKind
  /** Título de la fila. */
  label: string
  /** Línea de contexto: contacto, fecha, propósito. */
  meta?: string
  /** Cifra a la derecha, ya formateada. */
  amount?: string
  /** Etiqueta de estado, solo cuando dice algo que urge. */
  status?: { label: string; tone: StatusTone }
  to: string
  Icon: LucideIcon
  /** Lo que se enseña en la vista previa: pares etiqueta-valor. */
  details: { label: string; value: string }[]
  /** Acción principal desde la propia paleta, si la hay. */
  action?: { label: string; to: string }
}

export interface SearchGroup {
  title: string
  items: SearchHit[]
}

/**
 * **La búsqueda global**, contra todo lo que se busca de verdad.
 *
 * Antes solo consultaba `/contacts`: no se podía encontrar una cuenta por
 * cobrar, un pago ni un egreso, que es justo lo que uno teclea cuando teclea. Se
 * lanzan cinco consultas en paralelo, tres resultados cada una y con el mismo
 * `q` ya rebotado que usa la paleta.
 *
 * **Los nombres de contacto se resuelven en el cliente** porque las listas de
 * cartera y pagos solo traen `payerContactId`. La consulta que los trae es la
 * misma que usan las páginas de lista, así que en la práctica ya está en caché.
 * Está anotado en `contract/HANDOFF-buscador.md`: con un `payerName` en la
 * respuesta esto sobraría.
 */
export function useGlobalSearch(orgId: string | undefined, q: string) {
  const on = q ? orgId : undefined

  const { contacts, isFetching: contactsFetching } = useContacts(on, {
    page: 1,
    pageSize: PER_TYPE,
    q,
    sort: 'name',
    order: 'asc',
  })
  const { items: receivables, isFetching: cxcFetching } = useReceivables(on, {
    page: 1,
    pageSize: PER_TYPE,
    q,
  })
  const { items: expenses, isFetching: cxpFetching } = useExpenses(on, {
    page: 1,
    pageSize: PER_TYPE,
    q,
  })
  const { items: payments, isFetching: paymentsFetching } = usePayments(on, {
    page: 1,
    pageSize: PER_TYPE,
    q,
  })
  const { items: disbursements, isFetching: disbFetching } = useDisbursements(on, {
    page: 1,
    pageSize: PER_TYPE,
    q,
  })

  /* Directorio para poner nombres donde el API manda identificadores. */
  const { contacts: directory } = useContacts(orgId, {
    page: 1,
    pageSize: 100,
    sort: 'name',
    order: 'asc',
  })
  const nameOf = useMemo(
    () => new Map(directory.map((c) => [c.id, c.displayName])),
    [directory],
  )

  const groups = useMemo<SearchGroup[]>(() => {
    const result: SearchGroup[] = []
    const name = (id: string) => nameOf.get(id) ?? 'Contacto'

    if (contacts.length > 0) {
      result.push({
        title: 'Contactos',
        items: contacts.map((c) => ({
          id: `contact:${c.id}`,
          kind: 'contact',
          label: c.displayName,
          meta:
            [documentText(c), c.email ?? c.phone].filter(Boolean).join(' · ') || undefined,
          to: `/contactos/${c.id}`,
          Icon: Users,
          details: [
            { label: 'Tipo', value: c.contactType === 'COMPANY' ? 'Empresa' : 'Persona' },
            { label: 'Documento', value: documentText(c) || '—' },
            { label: 'Correo', value: c.email ?? '—' },
            { label: 'Teléfono', value: c.phone ?? '—' },
            { label: 'Estado', value: c.isActive ? 'Activo' : 'Archivado' },
          ],
          action: { label: 'Registrar pago', to: '/cartera/pagos/nuevo' },
        })),
      })
    }

    if (receivables.length > 0) {
      result.push({
        title: 'Cuentas por cobrar',
        items: receivables.map((r) => ({
          id: `receivable:${r.receivableId}`,
          kind: 'receivable',
          label: name(r.payerContactId),
          meta: `Vence ${formatDateHuman(r.dueDate)}`,
          amount: formatMoney(r.balance, r.currency),
          status: receivableStatus(r.displayStatus),
          to: `/cartera/cxc/${r.receivableId}`,
          Icon: Coins,
          details: [
            { label: 'Saldo', value: formatMoney(r.balance, r.currency) },
            { label: 'Total', value: formatMoney(r.originalAmount, r.currency) },
            { label: 'Vence', value: formatDateHuman(r.dueDate) },
            { label: 'Estado', value: receivableStatus(r.displayStatus).label },
          ],
          action: { label: 'Registrar pago', to: '/cartera/pagos/nuevo' },
        })),
      })
    }

    if (expenses.length > 0) {
      result.push({
        title: 'Cuentas por pagar',
        items: expenses.map((e) => ({
          id: `expense:${e.expenseId}`,
          kind: 'expense',
          label: name(e.supplierContactId),
          meta: `Vence ${formatDateHuman(e.dueDate)}`,
          amount: formatMoney(e.balance, e.currency),
          status: expenseStatus(e.displayStatus),
          to: `/gastos/cxp/${e.expenseId}`,
          Icon: Coins,
          details: [
            { label: 'Saldo', value: formatMoney(e.balance, e.currency) },
            { label: 'Total', value: formatMoney(e.originalAmount, e.currency) },
            { label: 'Vence', value: formatDateHuman(e.dueDate) },
            { label: 'Estado', value: expenseStatus(e.displayStatus).label },
          ],
          action: { label: 'Registrar egreso', to: '/gastos/egresos/nuevo' },
        })),
      })
    }

    if (payments.length > 0) {
      result.push({
        title: 'Pagos',
        items: payments.map((p) => ({
          id: `payment:${p.id}`,
          kind: 'payment',
          label: name(p.payerContactId ?? ''),
          meta: formatDateHuman(p.receivedAt),
          amount: formatMoney(p.amount),
          to: `/cartera/pagos/${p.id}`,
          Icon: Banknote,
          details: [
            { label: 'Monto', value: formatMoney(p.amount) },
            { label: 'Recibido', value: formatDateHuman(p.receivedAt) },
            { label: 'Referencia', value: p.reference ?? '—' },
          ],
        })),
      })
    }

    if (disbursements.length > 0) {
      result.push({
        title: 'Egresos',
        items: disbursements.map((d) => ({
          id: `disbursement:${d.id}`,
          kind: 'disbursement',
          label: name(d.supplierContactId ?? ''),
          meta: formatDateHuman(d.disbursedAt),
          amount: formatMoney(d.amount),
          to: `/gastos/egresos/${d.id}`,
          Icon: HandCoins,
          details: [
            { label: 'Monto', value: formatMoney(d.amount) },
            { label: 'Pagado', value: formatDateHuman(d.disbursedAt) },
            { label: 'Referencia', value: d.reference ?? '—' },
          ],
        })),
      })
    }

    return result
  }, [contacts, receivables, expenses, payments, disbursements, nameOf])

  return {
    groups,
    isFetching:
      contactsFetching || cxcFetching || cxpFetching || paymentsFetching || disbFetching,
  }
}
