import { useEffect } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { subscribeToRealtime } from '@/lib/realtime-stream'

/**
 * Los cinco recursos que el servidor anuncia como «esta lista se quedó vieja».
 *
 * Es el catálogo cerrado del contrato (`RESOURCE_KINDS`). Uno que no esté aquí
 * llega y no invalida nada, que es preferible a invalidarlo todo por si acaso.
 */
export type ResourceKind =
  | 'receivables'
  | 'payments'
  | 'expenses'
  | 'disbursements'
  | 'treasury'

/**
 * Qué endpoints deja viejos cada recurso, por el trozo de URL que los nombra.
 *
 * **Solo lo suyo, y a propósito.** Registrar un pago mueve también el saldo de
 * la cuenta por cobrar y el de la caja, pero eso no se deduce aquí: el servidor
 * emite las tres tramas (`payments`, `receivables`, `treasury`) porque es él
 * quien sabe qué tocó de verdad. Adivinarlo en el cliente sería una segunda
 * tabla de reglas que se separa de la suya a la primera operación nueva.
 *
 * Por el prefijo de la URL y no por la clave generada: Orval construye sus
 * claves como `[url, params?]`, así que la URL **es** la clave, y una lista con
 * filtros y páginas distintas cae entera con el mismo prefijo.
 */
const RESOURCE_PATHS: Record<ResourceKind, string[]> = {
  receivables: ['/receivables'],
  payments: ['/payments'],
  expenses: ['/expenses'],
  disbursements: ['/disbursements'],
  // La caja son sus saldos y sus movimientos; las transferencias cuelgan de la
  // primera. Cae también el catálogo de cuentas, que es donde vive el saldo.
  treasury: ['/financial-accounts', '/financial-movements'],
}

/**
 * Y los informes caen con **cualquiera** de los cinco.
 *
 * No hay tabla de qué informe depende de qué recurso, y no por pereza: esa
 * dependencia no está en el contrato, así que sería una lista nuestra que nadie
 * se acuerda de tocar el día que un informe empiece a mirar otra cosa. Refrescar
 * de más aquí no cuesta casi nada — TanStack solo vuelve a pedir lo que está
 * montado, así que fuera del panel y de los informes esto no dispara ni una
 * petición.
 */
const REPORTS = '/reports/'

/** Si esta consulta mira alguno de esos endpoints. */
function matches(queryKey: readonly unknown[], paths: string[]): boolean {
  const url = queryKey[0]
  if (typeof url !== 'string') return false
  return url.includes(REPORTS) || paths.some((path) => url.includes(path))
}

export function invalidateResource(qc: QueryClient, resource: string): void {
  const paths = RESOURCE_PATHS[resource as ResourceKind]
  if (!paths) return
  void qc.invalidateQueries({ predicate: (query) => matches(query.queryKey, paths) })
}

/**
 * **Lo que otro registró aparece sin recargar.**
 *
 * Se engancha al stream único de la aplicación (§11.1.9): llega el aviso de que
 * una lista cambió y se invalida, no se inserta nada. Los datos entran siempre
 * por el mismo sitio —su endpoint—, así que ponerse al día tras un aviso y
 * ponerse al día tras reconectar son la misma llamada.
 *
 * El servidor **ya filtra por permiso** antes de emitir: quien no puede leer
 * egresos no recibe la trama que los nombra. Aquí no hay que volver a mirarlo.
 *
 * Se monta una vez, en el shell.
 */
export function useResourceStream(orgId: string | undefined): void {
  const qc = useQueryClient()

  useEffect(() => {
    if (!orgId) return
    return subscribeToRealtime(orgId, (event) => {
      if (event.kind !== 'resource' || !event.resource) return
      invalidateResource(qc, event.resource)
    })
  }, [orgId, qc])
}
