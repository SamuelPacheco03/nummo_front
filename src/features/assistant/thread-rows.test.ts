import { describe, expect, it } from 'vitest'
import { buildThreadRows } from './utils'
import type { ChatMessage, ChatRole } from './types'

/** Marca ISO a partir de una hora **local**, que es como la lee quien mira el hilo. */
const at = (y: number, m: number, d: number, h = 12, min = 0) =>
  new Date(y, m - 1, d, h, min).toISOString()

const msg = (id: string, role: ChatRole, when: string): ChatMessage => ({
  id,
  role,
  content: id,
  at: when,
})

const HOY = new Date(2026, 7, 19, 12) // 19 de agosto de 2026, local

describe('separadores de fecha', () => {
  it('el primer mensaje siempre abre con su día', () => {
    const [row] = buildThreadRows([msg('m1', 'user', at(2026, 8, 19))], HOY)
    expect(row?.daySeparator).toBe('Hoy')
  })

  it('solo se marca cuando cambia el día, no en cada mensaje', () => {
    const rows = buildThreadRows(
      [
        msg('m1', 'user', at(2026, 8, 18, 9)),
        msg('m2', 'assistant', at(2026, 8, 18, 9, 1)),
        msg('m3', 'user', at(2026, 8, 19, 10)),
      ],
      HOY,
    )

    expect(rows.map((r) => r.daySeparator)).toEqual(['Ayer', null, 'Hoy'])
  })

  it('el día es el de quien lee, no el de UTC', () => {
    /*
      La trampa que esto fija: recortar los diez primeros caracteres del ISO da el día
      en UTC. En Colombia eso adelanta cinco horas, así que dos mensajes de la misma
      jornada —uno de madrugada y otro de noche— caían en días distintos y aparecía un
      separador en mitad de la conversación.
    */
    const rows = buildThreadRows(
      [msg('m1', 'user', at(2026, 8, 18, 0, 30)), msg('m2', 'user', at(2026, 8, 18, 23, 30))],
      HOY,
    )

    expect(rows[0]?.daySeparator).toBe('Ayer')
    expect(rows[1]?.daySeparator).toBeNull()
  })
})

describe('agrupación', () => {
  it('lo seguido del mismo lado no repite la cara', () => {
    const rows = buildThreadRows(
      [
        msg('m1', 'assistant', at(2026, 8, 19, 10, 0)),
        msg('m2', 'assistant', at(2026, 8, 19, 10, 1)),
      ],
      HOY,
    )

    expect(rows[0]?.grouped).toBe(false)
    expect(rows[1]?.grouped).toBe(true)
  })

  it('cambiar de lado corta la tanda', () => {
    const rows = buildThreadRows(
      [
        msg('m1', 'assistant', at(2026, 8, 19, 10, 0)),
        msg('m2', 'user', at(2026, 8, 19, 10, 1)),
        msg('m3', 'assistant', at(2026, 8, 19, 10, 2)),
      ],
      HOY,
    )

    expect(rows.map((r) => r.grouped)).toEqual([false, false, false])
  })

  it('un silencio largo también: media hora después ya es otra conversación', () => {
    const rows = buildThreadRows(
      [
        msg('m1', 'assistant', at(2026, 8, 19, 10, 0)),
        msg('m2', 'assistant', at(2026, 8, 19, 10, 30)),
      ],
      HOY,
    )

    expect(rows[1]?.grouped).toBe(false)
  })

  it('un cambio de día nunca agrupa, aunque sean del mismo lado y seguidos', () => {
    // Medianoche justa: cinco minutos de diferencia, pero con un separador en medio.
    // Agrupar por debajo de él dejaría una burbuja huérfana bajo la etiqueta.
    const rows = buildThreadRows(
      [
        msg('m1', 'assistant', at(2026, 8, 18, 23, 58)),
        msg('m2', 'assistant', at(2026, 8, 19, 0, 1)),
      ],
      HOY,
    )

    expect(rows[1]?.daySeparator).toBe('Hoy')
    expect(rows[1]?.grouped).toBe(false)
  })
})
