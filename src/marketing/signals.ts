import { postApiV1PublicSignals } from '@/api/generated/endpoints/public/public'
import type { LandingEventInput, LandingUtm, TrackInput } from '@/api/generated/model'
import { apiUrl } from '@/lib/api-config'

/**
 * Las señales de la portada: qué miró un visitante y dónde pulsó.
 *
 * Tres reglas del contrato que la implementación tiene que respetar, y que no son
 * detalles (`contract/HANDOFF-landing.md`):
 *
 * 1. **El catálogo es cerrado y un nombre fuera de él tumba el LOTE ENTERO con 422.**
 *    Aquí no puede pasar: `LandingEventInput` llega de Orval como unión discriminada, así
 *    que inventarse un nombre no compila. Es la diferencia entre enterarse al escribir y
 *    enterarse en producción.
 * 2. **`accepted: 0` no es un error.** Es lo que responde el servidor cuando el lote ya
 *    lo había visto —un observador de scroll que dispara de más, un beacon que reintenta—
 *    y la deduplicación es suya, por sesión. No se reintenta ni se avisa.
 * 3. **`numi_asked` existe en el catálogo pero el cliente no puede emitirlo**: lo escribe
 *    el endpoint que contesta. Mandarlo es un 422.
 *
 * Y una que no es del contrato sino de sentido común: **la analítica nunca rompe la
 * página**. Todo lo de aquí falla en silencio.
 */

/** El id de sesión vive lo que la pestaña; la atribución entre visitas la lleva la cookie. */
const CLAVE_SESION = 'nummo-landing-session'

/** El contrato acepta de 1 a 20 eventos por lote. */
const TOPE_LOTE = 20

/** Cada cuánto se vacía la cola. Ni por evento —serían decenas— ni tan tarde que se pierda. */
const INTERVALO_MS = 4000

/**
 * Id opaco para el servidor, de 8 a 40 caracteres.
 *
 * `sessionStorage` y no `localStorage` a propósito: identifica **una visita**, que es la
 * unidad en la que el servidor deduplica. Lo que une dos visitas es la cookie de
 * visitante, que la escribe el backend y el front ni lee ni necesita.
 */
function nuevaSesion(): string {
  const azar =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(36).slice(2).padEnd(24, '0')
  return `s-${azar.slice(0, 32)}`
}

export function sessionId(): string {
  try {
    const guardado = sessionStorage.getItem(CLAVE_SESION)
    if (guardado) return guardado
    const nuevo = nuevaSesion()
    sessionStorage.setItem(CLAVE_SESION, nuevo)
    return nuevo
  } catch {
    /* Modo privado o storage bloqueado: la visita sigue, sin continuidad entre recargas. */
    return nuevaSesion()
  }
}

/** Las cinco UTM del contrato, o nada si la URL no trae ninguna. */
export function utmDesde(search: string): LandingUtm | null {
  const q = new URLSearchParams(search)
  const utm: LandingUtm = {
    source: q.get('utm_source'),
    medium: q.get('utm_medium'),
    campaign: q.get('utm_campaign'),
    content: q.get('utm_content'),
    term: q.get('utm_term'),
  }
  return Object.values(utm).some((v) => v) ? utm : null
}

/** El transporte, inyectable para poder probar la cola sin red ni temporizadores. */
export interface Transporte {
  /** Envío normal. Devuelve cuántos eventos eran nuevos, o null si no se pudo. */
  enviar: (lote: TrackInput) => Promise<number | null>
  /** Envío de despedida: tiene que sobrevivir a que la pestaña se cierre. */
  despedir: (lote: TrackInput) => void
}

export const transporteReal: Transporte = {
  async enviar(lote) {
    try {
      const res = await postApiV1PublicSignals(lote)
      /* `accepted: 0` es una respuesta buena: el servidor ya tenía estos eventos. */
      return res.status === 200 ? res.data.accepted : null
    } catch {
      return null
    }
  },
  despedir(lote) {
    /*
      `sendBeacon` y no `fetch`: en `pagehide` el navegador puede matar una petición
      normal a mitad, y este es justo el momento en que se pierde el último `cta_clicked`
      —el que dice si la visita convirtió—. Va con `credentials` implícitas: el beacon
      manda las cookies de primer origen, que es lo que necesita la atribución.
    */
    try {
      const cuerpo = new Blob([JSON.stringify(lote)], { type: 'application/json' })
      navigator.sendBeacon?.(apiUrl('/api/v1/public/signals'), cuerpo)
    } catch {
      /* Si el beacon no está o falla, se pierde el último lote. No se rompe nada. */
    }
  },
}

export interface Cola {
  /** Encola un evento. Si la cola llega al tope del contrato, se vacía sola. */
  encolar: (evento: LandingEventInput) => void
  /** Manda lo pendiente. `despedida` usa el transporte que sobrevive al cierre. */
  vaciar: (despedida?: boolean) => void
  /** Cuántos eventos hay sin mandar. Para los tests. */
  pendientes: () => number
}

export interface OpcionesCola {
  transporte?: Transporte
  landingPath?: string
  referrer?: string | null
  utm?: LandingUtm | null
  obtenerSesion?: () => string
}

/**
 * La cola de señales.
 *
 * Por lotes y no evento a evento: un observador de scroll sobre diez secciones genera
 * decenas de eventos en un desplazamiento, y una petición por cada uno convierte la
 * portada en algo que parece que está haciendo minería.
 */
export function crearCola(opciones: OpcionesCola = {}): Cola {
  const {
    transporte = transporteReal,
    landingPath = '/',
    referrer = null,
    utm = null,
    obtenerSesion = sessionId,
  } = opciones

  let cola: LandingEventInput[] = []

  const lote = (eventos: LandingEventInput[]): TrackInput => ({
    sessionId: obtenerSesion(),
    landingPath,
    referrer,
    utm,
    events: eventos,
  })

  function vaciar(despedida = false) {
    if (cola.length === 0) return
    /*
      Se corta al tope del contrato y lo que sobra se queda para la siguiente vuelta: un
      lote de 21 sería un 422 que se lleva por delante los 20 buenos.
    */
    const salen = cola.slice(0, TOPE_LOTE)
    cola = cola.slice(TOPE_LOTE)
    if (despedida) {
      transporte.despedir(lote(salen))
      return
    }
    /*
      El `.catch` no sobra aunque `transporteReal` ya atrape dentro: `void` NO atrapa un
      rechazo, y una promesa sin manejar en el navegador acaba en el informe de errores de
      la página. La analítica no rompe la portada ni siquiera haciendo ruido.
    */
    transporte.enviar(lote(salen)).catch(() => null)
  }

  return {
    encolar(evento) {
      cola.push(evento)
      if (cola.length >= TOPE_LOTE) vaciar()
    },
    vaciar,
    pendientes: () => cola.length,
  }
}

/**
 * Arranca la cola de la página: la vacía cada pocos segundos y en cuanto la pestaña se
 * va. Devuelve la cola y cómo pararla.
 */
export function iniciarSenales(opciones: OpcionesCola = {}): { cola: Cola; parar: () => void } {
  const cola = crearCola(opciones)
  const intervalo = setInterval(() => cola.vaciar(), INTERVALO_MS)
  /*
    `pagehide` y no `beforeunload`: es el que dispara también cuando el móvil manda la
    pestaña al fondo, que en una portada es la salida más frecuente.
  */
  const alIrse = () => cola.vaciar(true)
  window.addEventListener('pagehide', alIrse)

  return {
    cola,
    parar() {
      clearInterval(intervalo)
      window.removeEventListener('pagehide', alIrse)
      cola.vaciar(true)
    },
  }
}
