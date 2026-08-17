import { formatMoney, plural } from '@/lib/format'

/**
 * Suma de saldos, por moneda.
 *
 * El API entrega el saldo de cada cuenta pero no un total, así que aquí se
 * agrega **solo para mostrar** (§88.4: el front nunca es fuente de verdad de un
 * saldo). Se agrupa por moneda a propósito: sumar pesos con dólares daría una
 * cifra que no significa nada, y en un producto multiempresa eso pasa.
 */
export function balanceByCurrency(
  balances: { currency: string; balance: string }[],
): Map<string, number> {
  const totals = new Map<string, number>()
  for (const b of balances) {
    const n = Number(b.balance)
    if (!Number.isFinite(n)) continue
    totals.set(b.currency, (totals.get(b.currency) ?? 0) + n)
  }
  return totals
}

/**
 * El insight del Panel. Se calcula **solo** con cifras que devuelve el API: §35
 * es tajante en que Numi nunca inventa un número, y eso vale también cuando
 * habla desde una tarjeta y no desde el chat.
 *
 * Se elige uno por prioridad —lo que duele antes que lo que informa— y si no hay
 * nada que decir, la tarjeta no se dibuja. Un insight de relleno es ruido.
 */
export function buildInsight({
  cxc,
  cxp,
  currency,
}: {
  cxc?: { overdueAmount: string; overdueCount: number; totalOutstanding: string }
  cxp?: { overdueAmount: string; overdueCount: number }
  currency?: string
}): { text: string; cta: string; to: string } | null {
  if (cxc && cxc.overdueCount > 0) {
    const outstanding = Number(cxc.totalOutstanding)
    const share =
      outstanding > 0 ? Math.round((Number(cxc.overdueAmount) / outstanding) * 100) : null
    const shareText = share === null ? '' : ` el ${share}% de todo lo que te deben,`
    return {
      text: `${formatMoney(cxc.overdueAmount, currency)} de tu cartera está vencida:${shareText} repartido en ${plural(cxc.overdueCount, 'cuenta', 'cuentas')}.`,
      cta: 'Ver cartera vencida',
      to: '/cartera/cxc',
    }
  }

  if (cxp && cxp.overdueCount > 0) {
    return {
      text: `Tienes ${plural(cxp.overdueCount, 'cuenta por pagar vencida', 'cuentas por pagar vencidas')} por ${formatMoney(cxp.overdueAmount, currency)}.`,
      cta: 'Ver cuentas por pagar',
      to: '/gastos/cxp',
    }
  }

  return null
}
