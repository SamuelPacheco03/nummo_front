import {
  AlertTriangle,
  ArrowDownLeft,
  Bell,
  CalendarClock,
  CircleCheck,
  CircleX,
  Gauge,
  Landmark,
  RefreshCw,
  Stamp,
  Undo2,
  UserPlus,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { StatusTone } from '@/components/ui/status-badge'
import type {
  NotificationCategory,
  NotificationPreferenceSupportedChannelsItem,
  NotificationType,
} from '@/api/generated/model'

/**
 * Un canal de entrega. Orval genera el mismo enum cuatro veces —uno por sitio
 * donde aparece en el contrato—, así que aquí se le pone **un** nombre y el
 * resto de la feature usa este.
 */
export type NotificationChannel = NotificationPreferenceSupportedChannelsItem

/**
 * Las cuatro categorías, con **las palabras de la navegación** (§14) y no las
 * del backend: quien mira el centro busca lo de «Gastos», no lo de `PAYABLES`.
 */
const CATEGORIES: Record<NotificationCategory, string> = {
  RECEIVABLES: 'Cartera',
  PAYABLES: 'Gastos',
  TREASURY: 'Caja',
  TEAM: 'Equipo',
  // Ni cartera ni gastos: es de la cuenta. Va aparte a propósito, y conviene
  // respetarlo — bajo `RECEIVABLES`, quien silenciara los avisos de cobranza se
  // perdería justo el que dice que la cobranza va a parar.
  ACCOUNT: 'Cuenta y plan',
}

/** El orden en que se ofrecen para filtrar: el del sidebar. */
export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  'RECEIVABLES',
  'PAYABLES',
  'TREASURY',
  'TEAM',
  // La última, como Configuración va al pie del sidebar: no es una sección de
  // trabajo.
  'ACCOUNT',
]

export function notificationCategory(category: string): string {
  return CATEGORIES[category as NotificationCategory] ?? category
}

/** El color del icono. Los cuatro tonos de §7, no una paleta nueva. */
const TONE_TEXT: Record<StatusTone, string> = {
  // `success-strong` y no `success`: el teal de marca vale como relleno, pero
  // como texto sobre fondo claro no llega a AA (§3.2).
  success: 'text-success-strong',
  warning: 'text-warning',
  destructive: 'text-destructive',
  muted: 'text-muted-foreground',
}

/**
 * La clave semántica que firma el backend (`icon`) traducida a un glifo de los
 * nuestros y a su tono.
 *
 * El backend manda una **clave**, no un icono, precisamente para que la
 * iconografía sea nuestra: `lucide-react` es la única familia del producto
 * (§37) y el día que cambie, cambia aquí y en ningún otro sitio.
 *
 * **Sin pastilla tintada detrás.** Un icono dentro de un cuadradito de color
 * repetido en cada fila es el tic de plantilla que §11.1 prohíbe: el icono va
 * al tamaño del texto y el color lo lleva él.
 */
const ICONS: Record<string, { Icon: LucideIcon; tone: StatusTone }> = {
  'receivable-due': { Icon: CalendarClock, tone: 'warning' },
  'receivable-overdue': { Icon: AlertTriangle, tone: 'destructive' },
  'payment-in': { Icon: ArrowDownLeft, tone: 'success' },
  'payment-reversed': { Icon: Undo2, tone: 'warning' },
  'payable-due': { Icon: CalendarClock, tone: 'warning' },
  'payable-overdue': { Icon: AlertTriangle, tone: 'destructive' },
  'auto-collect-failed': { Icon: CircleX, tone: 'destructive' },
  'auto-charge-failed': { Icon: CircleX, tone: 'destructive' },
  approval: { Icon: Stamp, tone: 'warning' },
  approved: { Icon: CircleCheck, tone: 'success' },
  rejected: { Icon: CircleX, tone: 'destructive' },
  balance: { Icon: Landmark, tone: 'warning' },
  recurring: { Icon: RefreshCw, tone: 'muted' },
  'team-activity': { Icon: Users, tone: 'muted' },
  member: { Icon: UserPlus, tone: 'muted' },
  // El cupo de WhatsApp. Ámbar y no rojo aunque el aviso sea el de agotado: no
  // es un fallo, es un tope que se renueva solo el mes que viene (§45.6).
  quota: { Icon: Gauge, tone: 'warning' },
}

/**
 * Icono de reserva. El contrato tipa `icon` como cadena libre, así que una
 * clave que este mapa no conozca **no puede dejar la fila sin icono**: se pinta
 * la campana y el aviso se lee igual (§70: lo que no se tiene no se inventa,
 * pero tampoco rompe la pantalla).
 */
const FALLBACK = { Icon: Bell, tone: 'muted' } as const

export function notificationIcon(icon: string): { Icon: LucideIcon; className: string } {
  const { Icon, tone } = ICONS[icon] ?? FALLBACK
  return { Icon, className: TONE_TEXT[tone] }
}

/**
 * Cada aviso, con **el mismo titular que le va a llegar al usuario**.
 *
 * No es una casualidad ni una copia perezosa del backend: el interruptor y la
 * notificación tienen que reconocerse el uno al otro. Quien acaba de recibir
 * «Tienes un cobro vencido» y viene a apagarlo busca esa frase, no una
 * paráfrasis nuestra («Vencimientos de cartera») que le obligue a deducir cuál
 * era.
 *
 * Es un `Record` sobre el enum del contrato **a propósito**: un tipo nuevo en el
 * backend rompe `tsc` en vez de aparecer en la pantalla como
 * `receivable.due_soon`. Se escriben uno a uno porque aquí la composición
 * `recurso · acción` que sirve para los permisos (§47.3) daría frases peores que
 * el silencio.
 */
const TYPE_COPY: Record<NotificationType, { label: string; hint?: string }> = {
  'receivable.due_soon': { label: 'Un cobro está por vencer' },
  'receivable.overdue': { label: 'Tienes un cobro vencido' },
  'receivable.overdue_digest': {
    label: 'Tu cartera necesita atención',
    hint: 'Un resumen diario, en vez de un aviso por cada cobro',
  },
  'payment.received': { label: 'Pago recibido' },
  'payment.reversed': { label: 'Se reversó un pago' },
  'recurring.receivables_generated': { label: 'Se generaron los cobros del período' },
  'payable.due_soon': { label: 'Un pago está por vencer' },
  'payable.overdue': { label: 'Tienes una cuenta por pagar vencida' },
  'payable.overdue_digest': {
    label: 'Tienes cuentas por pagar vencidas',
    hint: 'Un resumen diario, en vez de un aviso por cada cuenta',
  },
  'disbursement.pending_approval': { label: 'Un egreso espera tu aprobación' },
  'disbursement.approved': { label: 'Aprobaron tu egreso' },
  'disbursement.rejected': { label: 'Rechazaron tu egreso' },
  'recurring.expenses_generated': { label: 'Se generaron los gastos del período' },
  'auto_collect.failed': { label: 'Un cobro automático no se pudo registrar' },
  'auto_charge.failed': { label: 'Un pago automático no se pudo registrar' },
  'account.low_balance': {
    label: 'Una cuenta tiene el saldo bajo',
    hint: 'Cuando baja del mínimo que fija la organización',
  },
  'team.receivable_registered': {
    label: 'Se registró un cobro',
    hint: 'Cuando lo registra otra persona del equipo',
  },
  'team.expense_registered': {
    label: 'Se registró una cuenta por pagar',
    hint: 'Cuando lo registra otra persona del equipo',
  },
  'team.disbursement_registered': {
    label: 'Salió dinero de la caja',
    hint: 'Cuando lo registra otra persona del equipo',
  },
  'member.joined': { label: 'Alguien nuevo entró al equipo' },
  'member.role_changed': { label: 'Cambió tu rol' },
  /*
    Los dos del cupo de cobranza. Solo le llegan a quien tiene
    `messaging.settings.manage`, que es quien puede hacer algo —subir de plan o
    conectar cuenta propia—; el `hint` dice justo eso, porque el aviso sin salida
    es el que se aprende a ignorar.
  */
  'whatsapp_quota.warning': {
    label: 'Se está acabando el cupo de WhatsApp',
    hint: 'Al 80% del cupo del mes, mientras todavía da tiempo a decidir.',
  },
  'whatsapp_quota.exhausted': {
    label: 'Se acabó el cupo de WhatsApp',
    hint: 'Los recordatorios no vuelven a salir hasta el próximo periodo.',
  },
}

export function notificationTypeCopy(type: string): { label: string; hint?: string } {
  // Un tipo que el contrato estrene y esta tabla no tenga se enseña crudo: feo,
  // pero visible. Desaparecer sería peor — la persona no podría apagarlo.
  return TYPE_COPY[type as NotificationType] ?? { label: type }
}

/**
 * Por dónde entra un aviso, en la palabra del usuario. Dos formas del mismo
 * nombre: la larga para lo que se lee solo (el rótulo de una casilla) y la corta
 * para la cabecera de su columna, donde caben once caracteres.
 *
 * `INAPP` no está en esta lista **y no es un olvido**: el centro de
 * notificaciones no es un canal que se pueda apagar, es el registro. Todo lo que
 * se deja encendido queda ahí, y el motor del backend descarta `INAPP` al
 * decidir por dónde interrumpir. Una casilla «En la app» que no apagara nada
 * sería una mentira en la pantalla, así que no se dibuja (§11.1.10).
 */
const CHANNEL_LABELS: Partial<Record<NotificationChannel, { label: string; column: string }>> = {
  PUSH: { label: 'En el móvil', column: 'Móvil' },
  EMAIL: { label: 'Por correo', column: 'Correo' },
  WHATSAPP: { label: 'Por WhatsApp', column: 'WhatsApp' },
}

export function channelLabel(channel: string): string {
  return CHANNEL_LABELS[channel as NotificationChannel]?.label ?? channel
}

export function channelColumn(channel: string): string {
  return CHANNEL_LABELS[channel as NotificationChannel]?.column ?? channel
}

/**
 * Los canales que **interrumpen**, de entre los que este tipo admite y el
 * despliegue tiene encendidos.
 *
 * Las dos listas salen del contrato (`supportedChannels` y `availableChannels`),
 * nunca de una nuestra: el día que exista remitente de correo, la columna
 * aparece sola y aquí no se toca una línea.
 */
export function interruptingChannels(
  supported: readonly NotificationChannel[],
  available: readonly NotificationChannel[],
): NotificationChannel[] {
  const wired = new Set(available)
  return supported.filter((channel) => channel !== 'INAPP' && wired.has(channel))
}

/** «5 y 1», «5, 3 y 1» — una enumeración que se lee en voz alta. */
function listar(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`
}

/**
 * Con cuánta antelación avisa un recordatorio: «5 y 1 días antes», «1 día
 * antes», «el mismo día».
 *
 * Se lee, no se edita: los días los fija la organización y una persona solo
 * puede quedarse con menos de los que hay. **El contrato no publica cuáles hay**
 * —solo los que quedan tras esa resta—, así que un selector podría apagar días y
 * no volver a encenderlos. Anotado como petición de contrato en §95.17.
 */
export function leadDaysText(days: readonly number[]): string {
  const ordenados = [...new Set(days)].sort((a, b) => b - a)
  const antes = ordenados.filter((day) => day > 0)
  const partes: string[] = []
  if (antes.length > 0) {
    // «1 día antes», pero «5 y 1 días antes»: el plural lo pide la enumeración.
    const unidad = antes.length === 1 && antes[0] === 1 ? 'día' : 'días'
    partes.push(`${listar(antes.map(String))} ${unidad} antes`)
  }
  if (ordenados.includes(0)) partes.push('el mismo día')
  return listar(partes)
}
