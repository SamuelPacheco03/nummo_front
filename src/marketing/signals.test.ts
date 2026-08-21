import { afterEach, expect, test, vi } from 'vitest'
import type { TrackInput } from '@/api/generated/model'
import { crearCola, utmDesde, type Transporte } from './signals'

afterEach(() => vi.unstubAllGlobals())

/** Un transporte de mentira que solo apunta lo que le mandan. */
function espia() {
  const enviados: TrackInput[] = []
  const despedidas: TrackInput[] = []
  const transporte: Transporte = {
    enviar: async (lote) => {
      enviados.push(lote)
      return lote.events.length
    },
    despedir: (lote) => {
      despedidas.push(lote)
    },
  }
  return { transporte, enviados, despedidas }
}

const opciones = (t: Transporte) => ({
  transporte: t,
  landingPath: '/',
  obtenerSesion: () => 's-prueba-0001',
})

test('no manda nada si no hay nada que mandar', () => {
  const { transporte, enviados } = espia()
  crearCola(opciones(transporte)).vaciar()
  expect(enviados).toEqual([])
})

test('junta los eventos en un lote en vez de mandarlos de uno en uno', () => {
  const { transporte, enviados } = espia()
  const cola = crearCola(opciones(transporte))
  cola.encolar({ name: 'page_view', path: '/' })
  cola.encolar({ name: 'section_viewed', section: 'hero' })
  cola.encolar({ name: 'cta_clicked', section: 'hero', action: 'signup' })
  expect(enviados).toHaveLength(0)

  cola.vaciar()
  expect(enviados).toHaveLength(1)
  expect(enviados[0].events).toHaveLength(3)
  expect(enviados[0].sessionId).toBe('s-prueba-0001')
})

/*
  El tope del contrato es 20. Un lote de 21 no es «uno de más»: es un 422 que se lleva por
  delante los 20 buenos, así que la cola corta y guarda el resto para la vuelta siguiente.
*/
test('nunca manda más de veinte eventos en un lote', () => {
  const { transporte, enviados } = espia()
  const cola = crearCola(opciones(transporte))
  for (let i = 0; i < 25; i++) cola.encolar({ name: 'section_viewed', section: 'hero' })

  // Al llegar a veinte se vació sola.
  expect(enviados).toHaveLength(1)
  expect(enviados[0].events).toHaveLength(20)
  expect(cola.pendientes()).toBe(5)

  cola.vaciar()
  expect(enviados[1].events).toHaveLength(5)
})

test('la despedida usa el transporte que sobrevive al cierre', () => {
  const { transporte, enviados, despedidas } = espia()
  const cola = crearCola(opciones(transporte))
  cola.encolar({ name: 'cta_clicked', section: 'final_cta', action: 'signup' })

  cola.vaciar(true)
  expect(enviados).toHaveLength(0)
  expect(despedidas).toHaveLength(1)
  expect(despedidas[0].events[0]).toEqual({
    name: 'cta_clicked',
    section: 'final_cta',
    action: 'signup',
  })
})

/*
  `accepted: 0` es lo que responde el servidor cuando ya había visto el lote: su
  deduplicación es por sesión. No es un fallo, así que la cola no lo reintenta — si lo
  hiciera, un observador que dispara de más se convertiría en un bucle.
*/
test('un lote ya visto no se reintenta', async () => {
  const enviados: TrackInput[] = []
  const transporte: Transporte = {
    enviar: async (lote) => {
      enviados.push(lote)
      return 0
    },
    despedir: () => {},
  }
  const cola = crearCola(opciones(transporte))
  cola.encolar({ name: 'page_view', path: '/' })
  cola.vaciar()
  await Promise.resolve()

  expect(enviados).toHaveLength(1)
  expect(cola.pendientes()).toBe(0)
})

/* La analítica no rompe la página: si el transporte revienta, la cola sigue viva. */
test('un fallo de red no propaga', async () => {
  const transporte: Transporte = {
    enviar: async () => {
      throw new Error('sin red')
    },
    despedir: () => {},
  }
  const cola = crearCola(opciones(transporte))
  cola.encolar({ name: 'page_view', path: '/' })
  expect(() => cola.vaciar()).not.toThrow()
})

test('las UTM salen de la URL, y sin ninguna no se manda el objeto', () => {
  expect(utmDesde('?utm_source=instagram&utm_campaign=lanzamiento')).toEqual({
    source: 'instagram',
    medium: null,
    campaign: 'lanzamiento',
    content: null,
    term: null,
  })
  expect(utmDesde('?otra=cosa')).toBeNull()
  expect(utmDesde('')).toBeNull()
})
