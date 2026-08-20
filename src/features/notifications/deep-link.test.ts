import { describe, expect, it } from 'vitest'
import { notificationRoute } from './deep-link'

/*
  Lo que se prueba aquí no es una función: son **los once destinos que el backend
  sabe componer** (§95.16). Cada uno tiene que caer en una ruta que el router
  tenga, porque el fallo que esto arregla era un 404 al pulsar un aviso.
*/

describe('los destinos del contrato caen en rutas de esta aplicación', () => {
  it.each([
    ['/cartera/cobros/r1', '/cartera/cxc/r1'],
    ['/cartera?filter=vencidos', '/cartera/cxc?estado=OVERDUE'],
    ['/cartera', '/cartera/cxc'],
    ['/pagos/p1', '/cartera/pagos/p1'],
    ['/gastos/cuentas/e1', '/gastos/cxp/e1'],
    ['/gastos?filter=vencidos', '/gastos/cxp?estado=OVERDUE'],
    ['/gastos', '/gastos/cxp'],
    ['/egresos/d1', '/gastos/egresos/d1'],
    // Aprobar y rechazar están en la propia ficha (§47.4).
    ['/egresos/d1?action=approve', '/gastos/egresos/d1'],
    // Caja no tiene ficha por cuenta: es un resumen de saldos.
    ['/caja/cuentas/a1', '/caja/cuentas'],
    ['/configuracion/miembros', '/config/miembros'],
  ])('%s → %s', (delContrato, deAqui) => {
    expect(notificationRoute(delContrato)).toBe(deAqui)
  })
})

describe('lo que no reconoce', () => {
  it('pasa tal cual, para poder retirar esta tabla sin tocar nada', () => {
    // El día que el backend publique las rutas de verdad, ninguna regla casa.
    expect(notificationRoute('/cartera/cxc/r1')).toBe('/cartera/cxc/r1')
    expect(notificationRoute('/config/miembros')).toBe('/config/miembros')
  })

  it('no navega fuera de la aplicación', () => {
    // `//otro.sitio` es una URL absoluta disfrazada de ruta.
    expect(notificationRoute('//evil.example/x')).toBeNull()
    expect(notificationRoute('https://evil.example')).toBeNull()
    expect(notificationRoute(null)).toBeNull()
    expect(notificationRoute('')).toBeNull()
  })
})
