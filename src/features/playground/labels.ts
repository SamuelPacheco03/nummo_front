import type {
  PlaygroundActiveModelProvider,
  PlaygroundActiveModelSource,
  PlaygroundChatInputMode,
  PlaygroundToolWithheld,
} from '@/api/generated/model'
import type { StatusTone } from '@/components/ui/status-badge'

/**
 * Las palabras del playground. Los cinco roles predefinidos no están aquí:
 * `roleLabel` (features/organizations/roles) ya los nombra y son los mismos.
 */

const PROVIDERS: Record<PlaygroundActiveModelProvider, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  google: 'Google',
  deepseek: 'DeepSeek',
}

export function providerLabel(provider: string | null | undefined): string {
  if (!provider) return '—'
  return PROVIDERS[provider as PlaygroundActiveModelProvider] ?? provider
}

/**
 * De quién era la llave con la que corrió el turno.
 *
 * Importa más de lo que parece: un turno con `BYOK` gasta la cuota del cliente y uno con
 * `PLATFORM`, la nuestra.
 */
const SOURCES: Record<PlaygroundActiveModelSource, string> = {
  BYOK: 'Llave de la organización',
  PLATFORM: 'Llave de la plataforma',
}

export function sourceLabel(source: string | null | undefined): string {
  if (!source) return '—'
  return SOURCES[source as PlaygroundActiveModelSource] ?? source
}

export const MODES: { value: PlaygroundChatInputMode; label: string }[] = [
  { value: 'read_only', label: 'Solo lectura' },
  { value: 'read_write', label: 'Lectura y escritura' },
]

export function modeLabel(mode: PlaygroundChatInputMode): string {
  return MODES.find((m) => m.value === mode)?.label ?? mode
}

/**
 * **Por qué el modelo no ve una herramienta**, que es la mitad del valor del catálogo:
 * «no aparece porque el rol no puede» y «no aparece porque estás en solo lectura» son dos
 * bugs distintos, y sin decirlo los dos se investigan igual.
 */
const WITHHELD: Record<NonNullable<PlaygroundToolWithheld>, string> = {
  permission: 'El rol suplantado no tiene el permiso',
  read_only: 'La corrida es de solo lectura',
}

export function withheldLabel(withheld: PlaygroundToolWithheld): string | null {
  return withheld ? WITHHELD[withheld] : null
}

/** Estado de una herramienta en el catálogo: se ofrece o se retiene, y por qué. */
export function toolOfferStatus(
  offered: boolean,
  withheld: PlaygroundToolWithheld,
): { tone: StatusTone; label: string } {
  if (offered) return { tone: 'success', label: 'Se ofrece' }
  return { tone: 'muted', label: withheldLabel(withheld) ?? 'No se ofrece' }
}

/** Quién generó el turno: un cliente de verdad o una prueba desde aquí. */
export function originLabel(origin: string): string {
  if (origin === 'user') return 'Clientes'
  if (origin === 'playground') return 'Pruebas'
  return origin
}

/**
 * Cómo salió una corrida, en una sola insignia.
 *
 * El orden importa: un turno que **falló** es lo primero que hay que ver, y uno que el
 * usuario **detuvo** no es un fallo (§45). La cifra sin respaldo va en ámbar porque el
 * turno contestó —solo que con un número que ninguna herramienta devolvió—.
 */
export function runStatus(run: {
  failed: boolean
  stopped: boolean
  groundingViolated: boolean
}): { tone: StatusTone; label: string } {
  if (run.failed) return { tone: 'destructive', label: 'Falló' }
  if (run.stopped) return { tone: 'muted', label: 'Detenido' }
  if (run.groundingViolated) return { tone: 'warning', label: 'Cifra sin respaldo' }
  return { tone: 'success', label: 'Contestó' }
}

/** Qué clase de llamada fue: el turno, o el resumen que el backend hace por su cuenta. */
const KINDS: Record<string, string> = {
  turn: 'Turno',
  title: 'Título',
  summary: 'Resumen',
}

export function kindLabel(kind: string): string {
  return KINDS[kind] ?? kind
}

/** Cómo terminó el turno, en las palabras del modelo. */
const FINISH: Record<string, string> = {
  stop: 'Terminó de escribir',
  length: 'Se quedó sin espacio',
  'tool-calls': 'Esperando herramientas',
  'content-filter': 'Filtro de contenido',
  error: 'Error',
  other: 'Otro',
  unknown: 'Sin dato',
}

export function finishLabel(reason: string | null): string {
  if (!reason) return '—'
  return FINISH[reason] ?? reason
}
