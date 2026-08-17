import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router'
import {
  readFromParams,
  readStored,
  resolveInitial,
  writeToParams,
  type FilterValues,
} from './list-filters'

/**
 * Filtros de un listado, guardados en la URL y recordados en la sesión.
 *
 * **La URL es la fuente de verdad.** Es lo que hace que el botón «atrás»
 * funcione, que se pueda mandar «mira estas cuentas» por chat y que recargar no
 * devuelva al principio. El estado de React no duplica nada: se deriva de los
 * parámetros en cada render.
 *
 * `sessionStorage` solo cubre el hueco de volver a la sección sin enlace: se
 * restaura lo último y **se escribe en la URL**, para que lo que se ve y lo que
 * dice la barra de direcciones no cuenten cosas distintas.
 *
 * Se eligió sesión y no `localStorage` a propósito: un filtro de cartera es
 * contexto de un rato, no una preferencia. Que dentro de una semana la lista
 * abra filtrada por algo elegido hoy desorienta más de lo que ayuda.
 */
export function useListFilters<K extends string>(
  storageKey: string,
  keys: readonly K[],
): {
  values: Record<K, string>
  /** Cambia uno o varios criterios. Una cadena vacía quita el filtro. */
  set: (patch: Partial<Record<K, string>>) => void
  /** Suelta todos los criterios, también los recordados. */
  clear: () => void
} {
  const [params, setParams] = useSearchParams()
  const fromUrl = useMemo(() => readFromParams(params, keys), [params, keys])

  // El rescate de la sesión ocurre UNA vez por montaje. Sin esta guarda, limpiar
  // los filtros volvería a restaurarlos: al quedarse la URL sin parámetros, el
  // efecto los daría por «no puestos» y recuperaría lo guardado.
  const restoredRef = useRef(false)

  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true

    const stored = readStored(safeRead(storageKey), keys)
    const { values, restored } = resolveInitial(fromUrl, stored)
    if (!restored) return

    setParams((prev) => writeToParams(prev, values, keys), { replace: true })
    // Solo al montar: `fromUrl` cambia con cada filtro y reabriría el rescate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, keys, setParams])

  const persist = useCallback(
    (values: FilterValues) => safeWrite(storageKey, JSON.stringify(values)),
    [storageKey],
  )

  const set = useCallback(
    (patch: Partial<Record<K, string>>) => {
      setParams(
        (prev) => {
          const merged = { ...readFromParams(prev, keys), ...patch } as FilterValues
          persist(merged)
          return writeToParams(prev, merged, keys)
        },
        { replace: true },
      )
    },
    [setParams, keys, persist],
  )

  const clear = useCallback(() => {
    safeRemove(storageKey)
    setParams((prev) => writeToParams(prev, {}, keys), { replace: true })
  }, [setParams, keys, storageKey])

  const values = useMemo(() => {
    const out = {} as Record<K, string>
    for (const key of keys) out[key] = fromUrl[key] ?? ''
    return out
  }, [fromUrl, keys])

  return { values, set, clear }
}

/*
 * `sessionStorage` lanza en modo privado de Safari y con cookies de terceros
 * bloqueadas. Un filtro que no se recuerda es un inconveniente; una lista que no
 * carga, un fallo. Se degrada en silencio.
 */
function safeRead(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function safeWrite(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    /* sin memoria de filtros, pero la lista funciona */
  }
}

function safeRemove(key: string): void {
  try {
    sessionStorage.removeItem(key)
  } catch {
    /* idem */
  }
}
