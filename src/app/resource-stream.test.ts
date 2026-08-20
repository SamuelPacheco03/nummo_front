import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { invalidateResource } from './resource-stream'

/*
  Lo que se prueba es **el reparto**: qué consultas caen con cada aviso. El
  transporte ya lo cubre `lib/realtime-stream.test.ts`, y montar la aplicación
  entera para ver refrescarse una lista probaría TanStack, no esta tabla.
*/

let qc: QueryClient
let invalidadas: string[]

/** Deja una consulta en la caché con la clave que genera Orval: `[url, params?]`. */
function sembrar(url: string, params?: unknown) {
  const queryKey = params ? [url, params] : [url]
  qc.setQueryData(queryKey, { data: [] })
}

beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  invalidadas = []
  vi.spyOn(qc, 'invalidateQueries').mockImplementation(async (filters) => {
    const predicate = filters?.predicate
    if (!predicate) return
    for (const query of qc.getQueryCache().getAll()) {
      if (predicate(query)) invalidadas.push(String(query.queryKey[0]))
    }
  })
})

afterEach(() => vi.restoreAllMocks())

const ORG = '/api/v1/organizations/o1'

describe('qué cae con cada aviso', () => {
  test('un aviso de cartera no toca las listas de los demás', () => {
    sembrar(`${ORG}/receivables`, { page: 1 })
    sembrar(`${ORG}/payments`)
    sembrar(`${ORG}/disbursements`)

    invalidateResource(qc, 'receivables')

    expect(invalidadas).toEqual([`${ORG}/receivables`])
  })

  test('la misma lista con otros filtros cae igual', () => {
    // La clave de Orval es `[url, params]`, así que el prefijo las coge todas:
    // dos páginas de la misma lista no pueden quedarse una vieja y otra no.
    sembrar(`${ORG}/receivables`, { page: 1, status: 'OVERDUE' })
    sembrar(`${ORG}/receivables`, { page: 2 })
    sembrar(`${ORG}/receivables/r1`)

    invalidateResource(qc, 'receivables')

    expect(invalidadas).toHaveLength(3)
  })

  test('la caja son sus saldos, sus movimientos y el catálogo de cuentas', () => {
    sembrar(`${ORG}/financial-accounts/balances`)
    sembrar(`${ORG}/financial-movements`)
    sembrar(`${ORG}/financial-accounts`)
    sembrar(`${ORG}/payments`)

    invalidateResource(qc, 'treasury')

    expect(invalidadas).toHaveLength(3)
    expect(invalidadas).not.toContain(`${ORG}/payments`)
  })

  test('los informes caen con cualquiera de los cinco', () => {
    /*
      Qué informe depende de qué recurso no está en el contrato, así que una
      tabla nuestra se separaría a la primera vez que un informe mirase otra
      cosa. Refrescar de más aquí no cuesta: TanStack solo vuelve a pedir lo que
      está montado.
    */
    sembrar(`${ORG}/reports/cashflow`)
    sembrar(`${ORG}/reports/receivables-summary`)

    invalidateResource(qc, 'disbursements')

    expect(invalidadas).toHaveLength(2)
  })

  test('lo que no es de dinero se queda donde está', () => {
    sembrar(`${ORG}/contacts`)
    sembrar(`${ORG}/billing-concepts`)
    sembrar(`${ORG}/notifications/unread-count`)

    invalidateResource(qc, 'payments')

    expect(invalidadas).toEqual([])
  })

  test('los catálogos que se parecen no se confunden con las listas de dinero', () => {
    // `/payment-methods` no contiene `/payments`, ni `/expense-categories`
    // contiene `/expenses`. Vale la pena sujetarlo: el reparto va por prefijo.
    sembrar(`${ORG}/payment-methods`)
    sembrar(`${ORG}/expense-categories`)
    sembrar(`${ORG}/expense-schedules`)

    invalidateResource(qc, 'payments')
    invalidateResource(qc, 'expenses')

    expect(invalidadas).toEqual([])
  })

  test('un recurso que no conocemos no invalida nada', () => {
    // Preferible a barrerlo todo por si acaso: el día que el backend estrene
    // uno, lo que se nota es que esa lista no se refresca, no que la aplicación
    // se pase el día pidiendo.
    sembrar(`${ORG}/receivables`)

    invalidateResource(qc, 'lo-que-venga')

    expect(invalidadas).toEqual([])
  })
})
