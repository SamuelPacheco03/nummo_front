import {
  Bell,
  BellRing,
  Bot,
  Building2,
  CreditCard,
  Gauge,
  KeyRound,
  MapPin,
  MessageSquareQuote,
  MessageSquareText,
  MonitorSmartphone,
  Palette,
  Percent,
  Phone,
  ReceiptText,
  ShieldCheck,
  RefreshCw,
  Tags,
  UserCog,
  Wallet,
  Wallet2,
} from 'lucide-react'
import type { SectionGroup } from '@/components/ui/sectioned-layout'

/**
 * Todo lo que se configura una vez y luego se olvida. Vive aquí y no en el
 * sidebar porque §14 es explícito: la navegación principal sigue el modelo
 * mental del usuario, no el modelo de datos. Conceptos, categorías y métodos de
 * pago son catálogos que se tocan al montar la organización, no trabajo diario.
 *
 * **El eje de los grupos es a quién afecta el ajuste**, y en ese orden: lo mío,
 * lo de la organización, las listas que reutiliza todo el mundo, las reglas que
 * la aplicación aplica sola y el canal por el que sale. Antes eran cinco grupos
 * repartidos por otro criterio y se notaba: «Organización» acabó siendo un cajón
 * de siete que mezclaba la identidad de la empresa, su gente, la factura, una
 * política y **tus** sesiones —que no son de la organización, son tuyas—;
 * «Preferencias» ponía juntos el tema de tu pantalla y las credenciales de los
 * proveedores de IA; y WhatsApp estaba partido en tres entradas sueltas dentro
 * de Cartera. Ninguno pasa ahora de cinco destinos.
 */
export const GROUPS: SectionGroup[] = [
  {
    // Empieza por lo que solo te afecta a ti: nada de aquí cambia lo que ve
    // ningún compañero, y por eso no pide permiso alguno.
    title: 'Mi cuenta',
    items: [
      { to: '/config/apariencia', label: 'Apariencia', Icon: Palette },
      { to: '/config/notificaciones', label: 'Notificaciones', Icon: Bell },
      { to: '/config/sesiones', label: 'Sesiones', Icon: MonitorSmartphone },
      { to: '/config/aplicacion', label: 'Aplicación', Icon: RefreshCw },
    ],
  },
  {
    // La organización y su gente: quién es la empresa, dónde está, quién entra
    // y con qué alcance, y qué se le factura por ello.
    title: 'Organización',
    items: [
      { to: '/config/empresa', label: 'Empresa', Icon: Building2 },
      { to: '/config/sedes', label: 'Sedes', Icon: MapPin },
      { to: '/config/miembros', label: 'Miembros', Icon: UserCog },
      { to: '/config/roles', label: 'Roles', Icon: KeyRound },
      { to: '/config/plan', label: 'Plan y consumo', Icon: Gauge },
    ],
  },
  {
    // "Maestros" era jerga de backend. Son las listas base que se reutilizan.
    title: 'Catálogos',
    items: [
      { to: '/maestros/conceptos', label: 'Conceptos de cobro', Icon: ReceiptText },
      { to: '/maestros/categorias', label: 'Categorías de gasto', Icon: Tags },
      { to: '/maestros/metodos', label: 'Métodos de pago', Icon: CreditCard },
      { to: '/maestros/cuentas', label: 'Cuentas', Icon: Wallet },
    ],
  },
  {
    // Las tres políticas: no son datos, son decisiones que la aplicación aplica
    // sola —a qué hora avisa, cuánto interés corre, desde qué monto se aprueba—.
    // Tienen endpoint propio, permiso propio y se auditan aparte (§47.4), así
    // que estar juntas dice mejor lo que son que repartirlas por su área.
    title: 'Reglas',
    items: [
      { to: '/config/avisos', label: 'Política de avisos', Icon: BellRing },
      { to: '/cartera/interes', label: 'Políticas de interés', Icon: Percent },
      { to: '/gastos/aprobacion', label: 'Aprobación de egresos', Icon: ShieldCheck },
    ],
  },
  {
    // El canal entero en un sitio. Con el grupo diciendo «WhatsApp», repetirlo en
    // cada destino sobraba: en la paleta de comandos el grupo viaja como pista
    // («Configuración · WhatsApp») y también es lo que se busca.
    title: 'WhatsApp',
    items: [
      // Desde qué número sale: es otra pregunta que «¿puedo cobrar por
      // WhatsApp?», y por eso tiene pantalla propia (§11.1.16).
      { to: '/config/whatsapp', label: 'Número', Icon: Phone },
      { to: '/config/plantillas', label: 'Plantillas', Icon: MessageSquareQuote },
      // La política es un ajuste que se toca una vez; el historial de lo que se
      // le escribió al deudor es trabajo diario y vive en el sidebar (§14).
      { to: '/config/cobranza', label: 'Cobranza automática', Icon: MessageSquareText },
      // Dónde puede pagar el deudor. Se llamaba «Formas de pago» y sonaba igual
      // que los «Métodos de pago» del catálogo, siendo otra cosa: esto es lo que
      // sale en cada recordatorio, y cambiarlo cambia a qué cuenta llega la plata.
      { to: '/config/formas-de-pago', label: 'Dónde te pagan', Icon: Wallet2 },
    ],
  },
  {
    // Solo, y a propósito: el asistente es superficie de producto, no un ajuste
    // de la empresa, y el contrato ya trae voz y visión detrás de esta pantalla.
    title: 'Numi',
    items: [{ to: '/config/asistente', label: 'Asistente', Icon: Bot }],
  },
]

/** Rutas que cuelgan de Configuración, para que el sidebar marque su enlace activo. */
export const SETTINGS_PATHS = GROUPS.flatMap((g) => g.items.map((i) => i.to))

export function isSettingsPath(pathname: string): boolean {
  return SETTINGS_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}
