import {
  Apple,
  Backpack,
  Baby,
  Banknote,
  Beer,
  Bike,
  BookOpen,
  Bookmark,
  Briefcase,
  Building2,
  Bus,
  Cake,
  Calculator,
  Calendar,
  Car,
  Cat,
  Cloud,
  Coffee,
  Coins,
  CreditCard,
  Dog,
  Droplet,
  Dumbbell,
  Factory,
  FileText,
  Flame,
  Folder,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  Grid,
  Hammer,
  Handshake,
  HeartPulse,
  Home,
  Hospital,
  Key,
  Landmark,
  Laptop,
  Leaf,
  Lightbulb,
  Luggage,
  Megaphone,
  Monitor,
  Music,
  Package,
  Palette,
  Pencil,
  Percent,
  Phone,
  PiggyBank,
  Pill,
  Plane,
  Popcorn,
  Receipt,
  Repeat,
  Scissors,
  Server,
  Shield,
  Ship,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sofa,
  Star,
  Stethoscope,
  Store,
  Sun,
  Tag,
  Ticket,
  TrainFront,
  Trash2,
  TrendingDown,
  TrendingUp,
  Truck,
  Tv,
  UserRound,
  Users,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { SortChoice } from '@/components/ui/filter-sheet'
import { fold } from '@/lib/text'
import type { RowIcon } from '@/components/ui/row-icon'
import type { BillingConceptColor, BillingConceptIcon } from '@/api/generated/model'

/*
  El contrato admite `null` en los dos campos —«sin icono», «sin color»—, así que
  el tipo generado lo lleva dentro. Estas dos tablas son de lo que **sí** se
  elige, de modo que el nulo se quita aquí: quien recibe un `null` no busca en el
  mapa, coge el reemplazo.
*/
export type IconKey = NonNullable<BillingConceptIcon>
export type ColorKey = NonNullable<BillingConceptColor>

/**
 * **La identidad visual que la organización le pone a un concepto de cobro o a
 * una categoría de gasto.**
 *
 * Las dos listas son enums **cerrados del contrato** (`BillingConceptIcon`,
 * `BillingConceptColor`), y las claves son nombres de `lucide-react` y de la
 * paleta de Tailwind. Aquí se traducen a componentes y a clases: el backend
 * manda una clave, no un dibujo ni un hex, precisamente para que la iconografía
 * y el tema sigan siendo nuestros (§37).
 *
 * El `Record` va tipado contra el enum generado, así que una clave nueva en el
 * contrato rompe `tsc` en vez de dejar filas sin icono.
 */
const ICONS: Record<IconKey, LucideIcon> = {
  tag: Tag,
  folder: Folder,
  star: Star,
  bookmark: Bookmark,
  package: Package,
  grid: Grid,
  calendar: Calendar,
  repeat: Repeat,
  wallet: Wallet,
  banknote: Banknote,
  coins: Coins,
  'credit-card': CreditCard,
  'piggy-bank': PiggyBank,
  receipt: Receipt,
  landmark: Landmark,
  percent: Percent,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'file-text': FileText,
  calculator: Calculator,
  home: Home,
  key: Key,
  lightbulb: Lightbulb,
  droplet: Droplet,
  flame: Flame,
  wifi: Wifi,
  phone: Phone,
  'trash-2': Trash2,
  sofa: Sofa,
  car: Car,
  bus: Bus,
  fuel: Fuel,
  plane: Plane,
  bike: Bike,
  truck: Truck,
  ship: Ship,
  'train-front': TrainFront,
  utensils: Utensils,
  coffee: Coffee,
  'shopping-cart': ShoppingCart,
  'shopping-bag': ShoppingBag,
  apple: Apple,
  beer: Beer,
  cake: Cake,
  store: Store,
  popcorn: Popcorn,
  music: Music,
  'gamepad-2': Gamepad2,
  tv: Tv,
  ticket: Ticket,
  palette: Palette,
  dumbbell: Dumbbell,
  luggage: Luggage,
  'heart-pulse': HeartPulse,
  pill: Pill,
  stethoscope: Stethoscope,
  hospital: Hospital,
  'graduation-cap': GraduationCap,
  'book-open': BookOpen,
  backpack: Backpack,
  pencil: Pencil,
  briefcase: Briefcase,
  'building-2': Building2,
  users: Users,
  'user-round': UserRound,
  handshake: Handshake,
  megaphone: Megaphone,
  wrench: Wrench,
  hammer: Hammer,
  factory: Factory,
  shield: Shield,
  laptop: Laptop,
  smartphone: Smartphone,
  server: Server,
  cloud: Cloud,
  monitor: Monitor,
  dog: Dog,
  cat: Cat,
  baby: Baby,
  gift: Gift,
  shirt: Shirt,
  scissors: Scissors,
  leaf: Leaf,
  sun: Sun,
}

/** En el orden del contrato: es el que agrupa por temas (dinero, casa, transporte…). */
export const CATALOG_ICONS = Object.keys(ICONS) as IconKey[]

/**
 * **La única excepción viva a «solo tokens semánticos» (§91), y va acotada.**
 *
 * Un color de la paleta en un componente es una decisión de diseño escrita a
 * mano, y por eso está prohibido. Este no lo es: es **un dato que elige el
 * usuario**, publicado por el contrato como un enum cerrado de nombres de la
 * paleta de Tailwind. No hay token semántico que valga —«la categoría Netflix es
 * roja» no significa error—, y meter dieciocho pares nuevos en `index.css` sería
 * declarar como sistema lo que es contenido.
 *
 * Cada uno lleva su variante oscura: en el tema oscuro un `-600` sobre la
 * superficie de tarjeta se lee mal, y el color es justo lo que aquí hay que
 * distinguir de un vistazo.
 */
const COLORS: Record<ColorKey, string> = {
  slate: 'text-slate-600 dark:text-slate-300',
  gray: 'text-gray-600 dark:text-gray-300',
  red: 'text-red-600 dark:text-red-400',
  orange: 'text-orange-600 dark:text-orange-400',
  amber: 'text-amber-600 dark:text-amber-400',
  yellow: 'text-yellow-600 dark:text-yellow-400',
  lime: 'text-lime-600 dark:text-lime-400',
  green: 'text-green-600 dark:text-green-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  teal: 'text-teal-600 dark:text-teal-400',
  cyan: 'text-cyan-600 dark:text-cyan-400',
  blue: 'text-blue-600 dark:text-blue-400',
  indigo: 'text-indigo-600 dark:text-indigo-400',
  violet: 'text-violet-600 dark:text-violet-400',
  purple: 'text-purple-600 dark:text-purple-400',
  fuchsia: 'text-fuchsia-600 dark:text-fuchsia-400',
  pink: 'text-pink-600 dark:text-pink-400',
  rose: 'text-rose-600 dark:text-rose-400',
}

export const CATALOG_COLORS = Object.keys(COLORS) as ColorKey[]

/** Sin color elegido, el del texto apagado: no se inventa uno (§70). */
const NO_COLOR = 'text-muted-foreground'

export function catalogColorClass(color: string | null | undefined): string {
  return color ? (COLORS[color as ColorKey] ?? NO_COLOR) : NO_COLOR
}

/**
 * El icono de un catálogo, o `undefined` si no tiene.
 *
 * Quien lo pinta decide el reemplazo — en la lista de conceptos es el icono de
 * la sección—, porque un icono de reserva genérico aquí escondería que ese
 * registro todavía no tiene identidad propia.
 */
export function catalogIcon(icon: string | null | undefined): LucideIcon | undefined {
  return icon ? ICONS[icon as IconKey] : undefined
}

/**
 * Lo poco que hace falta saber de un concepto de cobro o de una categoría de
 * gasto para **pintar la fila de otra lista**: cómo se llama y cómo se ve.
 *
 * Las listas de dinero reciben del contrato el id del catálogo y nada más, así
 * que ya cruzaban contra él para el **nombre** (§95.19). El icono y el color
 * salen del mismo cruce, sin un viaje más.
 */
export interface CatalogRef {
  id: string
  name: string
  icon?: string | null
  color?: string | null
}

/**
 * El icono de un catálogo tal como lo quiere la tarjeta de una fila (§11.1.3b).
 *
 * `fallback` es el icono de la sección —un billete en pagos, un papel en los
 * recurrentes—: lo que se pinta cuando la fila no pertenece a ningún catálogo, o
 * cuando el catálogo todavía no ha llegado. Un genérico aquí no esconde nada,
 * porque el nombre va al lado.
 */
export function catalogRowIcon(item: CatalogRef | undefined, fallback: LucideIcon): RowIcon {
  return {
    Icon: catalogIcon(item?.icon) ?? fallback,
    className: item?.color ? catalogColorClass(item.color) : undefined,
  }
}

/**
 * Lo que elige el selector de identidad. `null` en cualquiera de los dos es
 * «sin poner».
 *
 * Va tipado contra los enums del contrato y no como `string`: es lo que hace que
 * el objeto entre tal cual en el cuerpo del `POST` y que una clave inventada no
 * llegue nunca al API.
 */
export interface CatalogIdentity {
  icon: IconKey | null
  color: ColorKey | null
}

/**
 * **Los iconos por temas**, que es como se busca uno: nadie recorre 84 dibujos
 * seguidos, pero sí baja hasta «Transporte» cuando la categoría es la gasolina.
 *
 * El contrato ya los publica agrupados —su orden es temático— y esto solo le
 * pone nombre a cada tramo. Por eso los grupos van sobre las **mismas** claves y
 * no sobre una lista aparte: si el backend añade una, el `Record` de abajo
 * obliga a nombrarla y la prueba obliga a colocarla en un grupo.
 */
export const CATALOG_ICON_GROUPS: { label: string; icons: IconKey[] }[] = [
  {
    label: 'General',
    icons: ['tag', 'folder', 'star', 'bookmark', 'package', 'grid', 'calendar', 'repeat'],
  },
  {
    label: 'Dinero',
    icons: [
      'wallet', 'banknote', 'coins', 'credit-card', 'piggy-bank', 'receipt', 'landmark',
      'percent', 'trending-up', 'trending-down', 'file-text', 'calculator',
    ],
  },
  {
    label: 'Casa y servicios',
    icons: ['home', 'key', 'lightbulb', 'droplet', 'flame', 'wifi', 'phone', 'trash-2', 'sofa'],
  },
  {
    label: 'Transporte',
    icons: ['car', 'bus', 'fuel', 'plane', 'bike', 'truck', 'ship', 'train-front'],
  },
  {
    label: 'Comida y compras',
    icons: [
      'utensils', 'coffee', 'shopping-cart', 'shopping-bag', 'apple', 'beer', 'cake', 'store',
    ],
  },
  {
    label: 'Ocio',
    icons: ['popcorn', 'music', 'gamepad-2', 'tv', 'ticket', 'palette', 'dumbbell', 'luggage'],
  },
  {
    label: 'Salud',
    icons: ['heart-pulse', 'pill', 'stethoscope', 'hospital'],
  },
  {
    label: 'Educación',
    icons: ['graduation-cap', 'book-open', 'backpack', 'pencil'],
  },
  {
    label: 'Trabajo',
    icons: [
      'briefcase', 'building-2', 'users', 'user-round', 'handshake', 'megaphone', 'wrench',
      'hammer', 'factory', 'shield',
    ],
  },
  {
    label: 'Tecnología',
    icons: ['laptop', 'smartphone', 'server', 'cloud', 'monitor'],
  },
  {
    label: 'Otros',
    icons: ['dog', 'cat', 'baby', 'gift', 'shirt', 'scissors', 'leaf', 'sun'],
  },
]

/**
 * Cómo se llama cada icono **en español**, que es lo que se ve al pasar por
 * encima y lo primero que busca el buscador. Las claves del contrato son
 * palabras inglesas (`piggy-bank`, `graduation-cap`): sin esta tabla, buscar
 * «alcancía» o «matrícula» no encontraría nada.
 */
export const ICON_LABELS: Record<IconKey, string> = {
  // General
  tag: 'Etiqueta',
  folder: 'Carpeta',
  star: 'Estrella',
  bookmark: 'Marcador',
  package: 'Paquete',
  grid: 'Cuadrícula',
  calendar: 'Calendario',
  repeat: 'Recurrente',
  // Dinero
  wallet: 'Billetera',
  banknote: 'Billete',
  coins: 'Monedas',
  'credit-card': 'Tarjeta',
  'piggy-bank': 'Alcancía',
  receipt: 'Recibo',
  landmark: 'Banco',
  percent: 'Porcentaje',
  'trending-up': 'Subida',
  'trending-down': 'Bajada',
  'file-text': 'Documento',
  calculator: 'Calculadora',
  // Casa y servicios
  home: 'Casa',
  key: 'Llave',
  lightbulb: 'Luz',
  droplet: 'Agua',
  flame: 'Gas',
  wifi: 'Internet',
  phone: 'Teléfono',
  'trash-2': 'Aseo',
  sofa: 'Muebles',
  // Transporte
  car: 'Carro',
  bus: 'Bus',
  fuel: 'Gasolina',
  plane: 'Avión',
  bike: 'Bicicleta',
  truck: 'Camión',
  ship: 'Barco',
  'train-front': 'Tren',
  // Comida y compras
  utensils: 'Restaurante',
  coffee: 'Café',
  'shopping-cart': 'Mercado',
  'shopping-bag': 'Compras',
  apple: 'Fruta',
  beer: 'Cerveza',
  cake: 'Pastel',
  store: 'Tienda',
  // Ocio
  popcorn: 'Cine',
  music: 'Música',
  'gamepad-2': 'Videojuegos',
  tv: 'Televisión',
  ticket: 'Entrada',
  palette: 'Arte',
  dumbbell: 'Gimnasio',
  luggage: 'Viaje',
  // Salud
  'heart-pulse': 'Salud',
  pill: 'Medicamento',
  stethoscope: 'Consulta',
  hospital: 'Hospital',
  // Educación
  'graduation-cap': 'Matrícula',
  'book-open': 'Libro',
  backpack: 'Mochila',
  pencil: 'Útiles',
  // Trabajo
  briefcase: 'Maletín',
  'building-2': 'Empresa',
  users: 'Equipo',
  'user-round': 'Persona',
  handshake: 'Acuerdo',
  megaphone: 'Publicidad',
  wrench: 'Mantenimiento',
  hammer: 'Obra',
  factory: 'Fábrica',
  shield: 'Seguro',
  // Tecnología
  laptop: 'Computador',
  smartphone: 'Celular',
  server: 'Servidor',
  cloud: 'Nube',
  monitor: 'Pantalla',
  // Otros
  dog: 'Perro',
  cat: 'Gato',
  baby: 'Bebé',
  gift: 'Regalo',
  shirt: 'Ropa',
  scissors: 'Peluquería',
  leaf: 'Jardín',
  sun: 'Sol',
}

/**
 * Lo que **también** encuentra a cada icono: los sinónimos y, sobre todo, las
 * palabras del negocio. Quien busca un icono para su categoría escribe
 * «arriendo», «nómina» o «pensión», no «casa» ni «equipo».
 *
 * Sin tildes a propósito: la búsqueda las quita de los dos lados (`fold`), así
 * que ponerlas aquí solo serviría para que se desactualizaran.
 */
const ICON_KEYWORDS: Record<IconKey, string> = {
  tag: 'concepto rotulo',
  folder: 'archivo expediente',
  star: 'favorito destacado',
  bookmark: 'guardado',
  package: 'envio producto encomienda',
  grid: 'categoria varios',
  calendar: 'fecha mes mensualidad periodo',
  repeat: 'suscripcion periodico mensual',
  wallet: 'cartera dinero efectivo',
  banknote: 'plata efectivo dinero',
  coins: 'moneda sencillo',
  'credit-card': 'tarjeta credito debito datafono',
  'piggy-bank': 'ahorro fondo',
  receipt: 'factura boleta comprobante',
  landmark: 'banco entidad financiera',
  percent: 'interes descuento mora comision',
  'trending-up': 'ingreso aumento rendimiento',
  'trending-down': 'egreso perdida descuento',
  'file-text': 'contrato documento acta',
  calculator: 'contabilidad impuesto iva',
  home: 'hogar arriendo alquiler vivienda apartamento',
  key: 'arriendo deposito llaves inmueble',
  lightbulb: 'energia electricidad luz servicio',
  droplet: 'agua acueducto servicio',
  flame: 'gas calefaccion servicio',
  wifi: 'internet red datos servicio',
  phone: 'telefono celular linea servicio',
  'trash-2': 'basura aseo reciclaje servicio',
  sofa: 'muebles hogar dotacion',
  car: 'auto vehiculo carro parqueadero',
  bus: 'transporte publico pasaje',
  fuel: 'gasolina combustible acpm',
  plane: 'vuelo avion viaje tiquete',
  bike: 'bici ciclismo',
  truck: 'camion flete envio acarreo',
  ship: 'barco maritimo',
  'train-front': 'tren metro',
  utensils: 'comida almuerzo restaurante alimentacion',
  coffee: 'cafe cafeteria tinto',
  'shopping-cart': 'mercado supermercado compras',
  'shopping-bag': 'compras tienda ropa',
  apple: 'fruta alimentacion',
  beer: 'bar cerveza licor',
  cake: 'pastel torta cumpleanos',
  store: 'tienda local negocio',
  popcorn: 'cine pelicula',
  music: 'musica spotify suscripcion',
  'gamepad-2': 'juego videojuego consola',
  tv: 'television streaming netflix',
  ticket: 'entrada boleta evento',
  palette: 'arte diseno pintura',
  dumbbell: 'gimnasio deporte ejercicio',
  luggage: 'viaje maleta turismo hotel',
  'heart-pulse': 'salud eps seguro medico',
  pill: 'medicina farmacia droga',
  stethoscope: 'medico consulta cita',
  hospital: 'clinica hospital urgencias',
  'graduation-cap': 'matricula grado universidad colegio pension',
  'book-open': 'libro texto lectura',
  backpack: 'mochila utiles colegio',
  pencil: 'lapiz utiles papeleria',
  briefcase: 'trabajo negocio honorarios',
  'building-2': 'empresa oficina sede arriendo',
  users: 'equipo nomina personal empleados',
  'user-round': 'persona cliente proveedor',
  handshake: 'acuerdo convenio contrato',
  megaphone: 'publicidad marketing pauta',
  wrench: 'mantenimiento reparacion tecnico',
  hammer: 'obra construccion remodelacion',
  factory: 'fabrica produccion planta',
  shield: 'seguro poliza proteccion vigilancia',
  laptop: 'computador portatil equipo',
  smartphone: 'celular movil telefono',
  server: 'servidor hosting nube',
  cloud: 'nube software suscripcion saas',
  monitor: 'pantalla monitor computador',
  dog: 'perro mascota veterinario',
  cat: 'gato mascota veterinario',
  baby: 'bebe guarderia jardin',
  gift: 'regalo bono detalle',
  shirt: 'ropa uniforme dotacion',
  scissors: 'peluqueria corte barberia',
  leaf: 'jardin planta ambiental',
  sun: 'sol energia solar',
}

/**
 * Todo lo que hace encontrar un icono, junto y ya normalizado: su nombre, sus
 * sinónimos, el grupo al que pertenece y la propia clave del contrato. Se arma
 * una vez, no en cada tecla.
 */
const ICON_HAYSTACK: Record<string, string> = Object.fromEntries(
  CATALOG_ICON_GROUPS.flatMap((group) =>
    group.icons.map((icon) => [
      icon,
      fold(`${ICON_LABELS[icon]} ${ICON_KEYWORDS[icon]} ${group.label} ${icon}`),
    ]),
  ),
)

/** ¿Este icono responde a lo que se está escribiendo? Sin texto, todos. */
export function iconMatches(icon: IconKey, query: string): boolean {
  const needle = fold(query.trim())
  return needle.length === 0 || (ICON_HAYSTACK[icon] ?? '').includes(needle)
}

/**
 * Cómo se llama cada color. Es lo que lee un lector de pantalla en la muestra
 * —un círculo de color sin nombre no dice nada (§46)— y lo que sale al pasar por
 * encima.
 */
export const COLOR_LABELS: Record<ColorKey, string> = {
  slate: 'Pizarra',
  gray: 'Gris',
  red: 'Rojo',
  orange: 'Naranja',
  amber: 'Ámbar',
  yellow: 'Amarillo',
  lime: 'Lima',
  green: 'Verde',
  emerald: 'Esmeralda',
  teal: 'Verde azulado',
  cyan: 'Cian',
  blue: 'Azul',
  indigo: 'Índigo',
  violet: 'Violeta',
  purple: 'Púrpura',
  fuchsia: 'Fucsia',
  pink: 'Rosa',
  rose: 'Rosado',
}

/**
 * Lo que aceptan los dos catálogos con orden propio. `position` es su valor por
 * defecto en el contrato y **no tiene columna**: se ofrece solo en el cajón,
 * como «Creación» (§18.1, regla 9).
 */
export const CATALOG_SORT_CHOICES: SortChoice[] = [
  { field: 'position', label: 'El tuyo', asc: 'Como los ordenaste', desc: 'Al revés' },
  { field: 'name', label: 'Nombre', asc: 'De la A a la Z', desc: 'De la Z a la A' },
  { field: 'createdAt', label: 'Creación', asc: 'Más antiguos', desc: 'Más recientes' },
]

export const CATALOG_DEFAULT_SORT = 'position'
