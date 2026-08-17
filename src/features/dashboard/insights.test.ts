import { describe, expect, it } from 'vitest'
import { balanceByCurrency, buildInsight } from './insights'

describe('balanceByCurrency', () => {
  it('suma los saldos de cada moneda por separado', () => {
    const totals = balanceByCurrency([
      { currency: 'COP', balance: '1000000.00' },
      { currency: 'COP', balance: '250000.50' },
      { currency: 'USD', balance: '300.00' },
    ])

    expect(totals.get('COP')).toBe(1_250_000.5)
    expect(totals.get('USD')).toBe(300)
  })

  it('nunca mezcla monedas en una sola cifra', () => {
    const totals = balanceByCurrency([
      { currency: 'COP', balance: '1000' },
      { currency: 'USD', balance: '1000' },
    ])

    expect(totals.size).toBe(2)
  })

  it('admite saldos negativos e ignora los que no son número', () => {
    const totals = balanceByCurrency([
      { currency: 'COP', balance: '1000' },
      { currency: 'COP', balance: '-400' },
      { currency: 'COP', balance: 'n/d' },
    ])

    expect(totals.get('COP')).toBe(600)
  })

  it('sin cuentas, no inventa un total', () => {
    expect(balanceByCurrency([]).size).toBe(0)
  })
})

describe('buildInsight', () => {
  const overdue = { overdueAmount: '2120000', overdueCount: 8, totalOutstanding: '7830000' }

  it('prioriza la cartera vencida y da el porcentaje sobre el total', () => {
    const insight = buildInsight({ cxc: overdue, currency: 'COP' })

    expect(insight?.text).toContain('$2.120.000')
    expect(insight?.text).toContain('27%') // 2.120.000 / 7.830.000
    expect(insight?.text).toContain('8 cuentas')
    expect(insight?.to).toBe('/cartera/cxc')
  })

  it('si no hay cartera vencida, mira lo que debes', () => {
    const insight = buildInsight({
      cxc: { overdueAmount: '0', overdueCount: 0, totalOutstanding: '500000' },
      cxp: { overdueAmount: '80000', overdueCount: 2 },
      currency: 'COP',
    })

    expect(insight?.text).toContain('2 cuentas por pagar vencidas')
    expect(insight?.to).toBe('/gastos/cxp')
  })

  it('sin nada que decir no se inventa un insight de relleno', () => {
    expect(buildInsight({})).toBeNull()
    expect(
      buildInsight({
        cxc: { overdueAmount: '0', overdueCount: 0, totalOutstanding: '0' },
        cxp: { overdueAmount: '0', overdueCount: 0 },
      }),
    ).toBeNull()
  })

  it('no divide por cero cuando hay mora pero el total es cero', () => {
    const insight = buildInsight({
      cxc: { overdueAmount: '5000', overdueCount: 1, totalOutstanding: '0' },
      currency: 'COP',
    })

    expect(insight).not.toBeNull()
    expect(insight?.text).not.toContain('NaN')
    expect(insight?.text).not.toContain('Infinity')
    expect(insight?.text).not.toContain('%')
  })
})
