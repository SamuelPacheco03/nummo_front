import { useMemo } from 'react'
import { keepPreviousData } from '@tanstack/react-query'
import { Banknote, Coins, HandCoins, Users, type LucideIcon } from 'lucide-react'
import { useGetApiV1OrganizationsOrgIdSearch } from '@/api/generated/endpoints/search/search'
import type { SearchHit as ApiHit, SearchResults } from '@/api/generated/model'
import { receivableStatus } from '@/features/receivables/labels'
import { expenseStatus } from '@/features/expenses/labels'
import { formatDateHuman, formatMoney } from '@/lib/format'
import type { StatusTone } from '@/components/ui/status-badge'

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

const GROUP_TITLE: Record<ResultKind, string> = {
  contact: 'Contactos',
  receivable: 'Cuentas por cobrar',
  expense: 'Cuentas por pagar',
  payment: 'Pagos',
  disbursement: 'Egresos',
}

const ICON: Record<ResultKind, LucideIcon> = {
  contact: Users,
  receivable: Coins,
  expense: Coins,
  payment: Banknote,
  disbursement: HandCoins,
}

const HREF: Record<ResultKind, (id: string) => string> = {
  contact: (id) => `/contactos/${id}`,
  receivable: (id) => `/cartera/cxc/${id}`,
  expense: (id) => `/gastos/cxp/${id}`,
  payment: (id) => `/cartera/pagos/${id}`,
  disbursement: (id) => `/gastos/egresos/${id}`,
}

/** Ficha de un contacto: lo que es, cómo se le encuentra y cuánto debe. */
function contactDetails(hit: ApiHit): { label: string; value: string }[] {
  const c = hit.contact
  if (!c) return []
  return [
    { label: 'Tipo', value: c.contactType === 'COMPANY' ? 'Empresa' : 'Persona' },
    { label: 'Documento', value: c.documentLabel ?? '—' },
    { label: 'Correo', value: c.email ?? '—' },
    { label: 'Teléfono', value: c.phone ?? '—' },
    { label: 'Estado', value: c.isActive ? 'Activo' : 'Archivado' },
    { label: 'Debe', value: formatMoney(c.summary.receivableBalance) },
    { label: 'Vencido', value: formatMoney(c.summary.receivableOverdue) },
    { label: 'Cuentas abiertas', value: String(c.summary.openReceivables) },
    { label: 'Último pago', value: formatDateHuman(c.summary.lastPaymentAt) || '—' },
  ]
}

function toHit(hit: ApiHit): SearchHit {
  const kind = hit.type as ResultKind
  const base = {
    id: `${kind}:${hit.id}`,
    kind,
    label: hit.title,
    to: HREF[kind](hit.id),
    Icon: ICON[kind],
  }

  switch (kind) {
    case 'contact':
      return {
        ...base,
        meta: hit.subtitle ?? undefined,
        details: contactDetails(hit),
        action: { label: 'Registrar pago', to: '/cartera/pagos/nuevo' },
      }
    case 'receivable':
    case 'expense': {
      const label = kind === 'receivable' ? receivableStatus : expenseStatus
      const money = formatMoney(hit.amount, hit.currency ?? undefined)
      return {
        ...base,
        meta: `Vence ${formatDateHuman(hit.date)}`,
        amount: money,
        status: hit.status ? label(hit.status) : undefined,
        details: [
          { label: 'Saldo', value: money },
          { label: 'Vence', value: formatDateHuman(hit.date) },
          { label: 'Estado', value: hit.status ? label(hit.status).label : '—' },
        ],
        action:
          kind === 'receivable'
            ? { label: 'Registrar pago', to: '/cartera/pagos/nuevo' }
            : { label: 'Registrar egreso', to: '/gastos/egresos/nuevo' },
      }
    }
    default: {
      const money = formatMoney(hit.amount)
      return {
        ...base,
        meta: formatDateHuman(hit.date),
        amount: money,
        details: [
          { label: 'Monto', value: money },
          { label: kind === 'payment' ? 'Recibido' : 'Pagado', value: formatDateHuman(hit.date) },
          { label: 'Referencia', value: hit.subtitle ?? '—' },
        ],
      }
    }
  }
}

/**
 * **La búsqueda global**, en una sola consulta.
 *
 * Antes eran cinco peticiones en paralelo más un directorio de cien contactos
 * para poner nombres donde el API mandaba identificadores — y una fila cuyo
 * contacto cayera fuera de esa página se quedaba sin nombre. Ahora el backend
 * devuelve los tipos mezclados, con el nombre de la contraparte dentro y **ya
 * ordenados por relevancia real**: exacto, prefijo, parcial, y al final lo que
 * casó por referencia, notas o monto.
 *
 * Los grupos se mantienen porque la paleta se lee mejor por secciones, pero su
 * orden ya no es fijo: **manda el mejor resultado de cada uno**. Tecleando una
 * referencia, Pagos encabeza; tecleando un nombre, Contactos.
 */
export function useGlobalSearch(orgId: string | undefined, q: string) {
  const on = q ? orgId : undefined
  const query = useGetApiV1OrganizationsOrgIdSearch(
    on ?? '',
    { q, limit: PER_TYPE },
    { query: { enabled: !!on, placeholderData: keepPreviousData } },
  )

  const hits = (query.data?.data as SearchResults | undefined)?.hits

  const groups = useMemo<SearchGroup[]>(() => {
    if (!hits?.length) return []

    const byKind = new Map<ResultKind, SearchHit[]>()
    for (const hit of hits) {
      const kind = hit.type as ResultKind
      const items = byKind.get(kind)
      if (items) items.push(toHit(hit))
      else byKind.set(kind, [toHit(hit)])
    }
    // El servidor ya vino ordenado, así que el primero de cada tipo es el mejor
    // de ese tipo y el orden de inserción es el orden de los grupos.
    return [...byKind].map(([kind, items]) => ({ title: GROUP_TITLE[kind], items }))
  }, [hits])

  return { groups, isFetching: query.isFetching }
}
