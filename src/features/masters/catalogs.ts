import {
  Ambulance,
  Apple,
  Armchair,
  Award,
  Baby,
  Backpack,
  Badge,
  Bandage,
  Banknote,
  Bath,
  Bed,
  Beef,
  Beer,
  Bike,
  Bird,
  Bone,
  BookOpen,
  Bookmark,
  Boxes,
  Brain,
  Briefcase,
  Building,
  Building2,
  Bus,
  BusFront,
  Cake,
  Calculator,
  Calendar,
  Camera,
  Car,
  CarFront,
  CarTaxiFront,
  Cat,
  ChefHat,
  Clapperboard,
  Cloud,
  Coffee,
  Coins,
  Cookie,
  CreditCard,
  Croissant,
  Crown,
  Database,
  Dog,
  DoorOpen,
  Droplet,
  Dumbbell,
  Egg,
  Eye,
  Factory,
  FileText,
  Film,
  Fish,
  Flame,
  Folder,
  Fuel,
  Gamepad2,
  Gavel,
  Gift,
  Glasses,
  GraduationCap,
  Grid,
  Guitar,
  Hammer,
  HandCoins,
  Handshake,
  HardHat,
  Headphones,
  Headset,
  HeartPulse,
  Highlighter,
  Home,
  Hospital,
  Hotel,
  IceCreamCone,
  Key,
  Keyboard,
  Lamp,
  Landmark,
  Laptop,
  Leaf,
  Library,
  Lightbulb,
  Luggage,
  Megaphone,
  Mic,
  Microscope,
  Monitor,
  Mouse,
  Music,
  Network,
  Notebook,
  NotebookPen,
  Package,
  Palette,
  PawPrint,
  Pencil,
  Percent,
  Phone,
  PiggyBank,
  Pill,
  Pizza,
  Plane,
  Plug,
  Popcorn,
  Presentation,
  Printer,
  Puzzle,
  QrCode,
  Rabbit,
  Receipt,
  Refrigerator,
  Repeat,
  Ruler,
  Sailboat,
  Salad,
  Sandwich,
  Scale,
  Scan,
  School,
  Scissors,
  Server,
  Shield,
  Ship,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  ShowerHead,
  Smartphone,
  Sofa,
  Soup,
  Sparkles,
  Star,
  Stethoscope,
  Store,
  Sun,
  Syringe,
  Tablet,
  Tag,
  TestTube,
  Thermometer,
  Ticket,
  Tractor,
  TrainFront,
  Trash2,
  Trees,
  TrendingDown,
  TrendingUp,
  Truck,
  Tv,
  Umbrella,
  UserRound,
  Users,
  Utensils,
  Vault,
  Wallet,
  Warehouse,
  WashingMachine,
  Wifi,
  Wine,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { SortChoice } from '@/components/ui/filter-sheet'
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
 * Las dos listas —161 iconos y 22 colores— son enums **cerrados del contrato**
 * (`BillingConceptIcon`, `BillingConceptColor`), y las claves son nombres de
 * `lucide-react` y de la paleta de Tailwind. Aquí se traducen a componentes y a clases: el backend
 * manda una clave, no un dibujo ni un hex, precisamente para que la iconografía
 * y el tema sigan siendo nuestros (§37).
 *
 * El `Record` va tipado contra el enum generado, así que una clave nueva en el
 * contrato rompe `tsc` en vez de dejar filas sin icono.
 */
const ICONS: Record<IconKey, LucideIcon> = {
  // General
  tag: Tag,
  folder: Folder,
  star: Star,
  bookmark: Bookmark,
  package: Package,
  boxes: Boxes,
  grid: Grid,
  calendar: Calendar,
  repeat: Repeat,
  // Dinero
  wallet: Wallet,
  banknote: Banknote,
  coins: Coins,
  'hand-coins': HandCoins,
  'credit-card': CreditCard,
  'piggy-bank': PiggyBank,
  vault: Vault,
  receipt: Receipt,
  landmark: Landmark,
  percent: Percent,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'file-text': FileText,
  calculator: Calculator,
  scale: Scale,
  gavel: Gavel,
  // Casa y servicios
  home: Home,
  'door-open': DoorOpen,
  key: Key,
  lightbulb: Lightbulb,
  lamp: Lamp,
  plug: Plug,
  droplet: Droplet,
  flame: Flame,
  wifi: Wifi,
  phone: Phone,
  'trash-2': Trash2,
  sofa: Sofa,
  armchair: Armchair,
  bed: Bed,
  bath: Bath,
  'shower-head': ShowerHead,
  'washing-machine': WashingMachine,
  refrigerator: Refrigerator,
  // Transporte
  car: Car,
  'car-front': CarFront,
  'car-taxi-front': CarTaxiFront,
  bus: Bus,
  'bus-front': BusFront,
  fuel: Fuel,
  plane: Plane,
  bike: Bike,
  truck: Truck,
  tractor: Tractor,
  ambulance: Ambulance,
  ship: Ship,
  sailboat: Sailboat,
  'train-front': TrainFront,
  // Comida y compras
  utensils: Utensils,
  'chef-hat': ChefHat,
  pizza: Pizza,
  sandwich: Sandwich,
  salad: Salad,
  soup: Soup,
  beef: Beef,
  fish: Fish,
  egg: Egg,
  croissant: Croissant,
  cookie: Cookie,
  'ice-cream-cone': IceCreamCone,
  coffee: Coffee,
  wine: Wine,
  'shopping-cart': ShoppingCart,
  'shopping-bag': ShoppingBag,
  apple: Apple,
  beer: Beer,
  cake: Cake,
  store: Store,
  // Ocio
  popcorn: Popcorn,
  film: Film,
  clapperboard: Clapperboard,
  camera: Camera,
  music: Music,
  headphones: Headphones,
  mic: Mic,
  guitar: Guitar,
  'gamepad-2': Gamepad2,
  puzzle: Puzzle,
  tv: Tv,
  ticket: Ticket,
  palette: Palette,
  dumbbell: Dumbbell,
  luggage: Luggage,
  // Salud
  'heart-pulse': HeartPulse,
  pill: Pill,
  syringe: Syringe,
  bandage: Bandage,
  thermometer: Thermometer,
  stethoscope: Stethoscope,
  brain: Brain,
  eye: Eye,
  glasses: Glasses,
  microscope: Microscope,
  'test-tube': TestTube,
  hospital: Hospital,
  // Educación
  'graduation-cap': GraduationCap,
  school: School,
  library: Library,
  'book-open': BookOpen,
  notebook: Notebook,
  'notebook-pen': NotebookPen,
  backpack: Backpack,
  pencil: Pencil,
  highlighter: Highlighter,
  ruler: Ruler,
  presentation: Presentation,
  // Trabajo
  award: Award,
  briefcase: Briefcase,
  building: Building,
  'building-2': Building2,
  warehouse: Warehouse,
  hotel: Hotel,
  users: Users,
  'user-round': UserRound,
  badge: Badge,
  handshake: Handshake,
  megaphone: Megaphone,
  network: Network,
  wrench: Wrench,
  hammer: Hammer,
  'hard-hat': HardHat,
  factory: Factory,
  shield: Shield,
  // Tecnología
  laptop: Laptop,
  smartphone: Smartphone,
  tablet: Tablet,
  server: Server,
  database: Database,
  cloud: Cloud,
  monitor: Monitor,
  keyboard: Keyboard,
  mouse: Mouse,
  headset: Headset,
  printer: Printer,
  scan: Scan,
  'qr-code': QrCode,
  // Otros
  dog: Dog,
  cat: Cat,
  'paw-print': PawPrint,
  bird: Bird,
  rabbit: Rabbit,
  bone: Bone,
  trees: Trees,
  leaf: Leaf,
  sun: Sun,
  baby: Baby,
  gift: Gift,
  shirt: Shirt,
  crown: Crown,
  umbrella: Umbrella,
  sparkles: Sparkles,
  scissors: Scissors,
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
  zinc: 'text-zinc-600 dark:text-zinc-300',
  neutral: 'text-neutral-600 dark:text-neutral-300',
  stone: 'text-stone-600 dark:text-stone-300',
  red: 'text-red-600 dark:text-red-400',
  orange: 'text-orange-600 dark:text-orange-400',
  amber: 'text-amber-600 dark:text-amber-400',
  yellow: 'text-yellow-600 dark:text-yellow-400',
  lime: 'text-lime-600 dark:text-lime-400',
  green: 'text-green-600 dark:text-green-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  teal: 'text-teal-600 dark:text-teal-400',
  cyan: 'text-cyan-600 dark:text-cyan-400',
  sky: 'text-sky-600 dark:text-sky-400',
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
 * **Los iconos por temas**, que es como se busca uno: nadie recorre 161 dibujos
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
    icons: [
      'tag', 'folder', 'star', 'bookmark', 'package', 'boxes', 'grid', 'calendar', 'repeat',
    ],
  },
  {
    label: 'Dinero',
    icons: [
      'wallet', 'banknote', 'coins', 'hand-coins', 'credit-card', 'piggy-bank', 'vault',
      'receipt', 'landmark', 'percent', 'trending-up', 'trending-down', 'file-text',
      'calculator', 'scale', 'gavel',
    ],
  },
  {
    label: 'Casa y servicios',
    icons: [
      'home', 'door-open', 'key', 'lightbulb', 'lamp', 'plug', 'droplet', 'flame', 'wifi',
      'phone', 'trash-2', 'sofa', 'armchair', 'bed', 'bath', 'shower-head', 'washing-machine',
      'refrigerator',
    ],
  },
  {
    label: 'Transporte',
    icons: [
      'car', 'car-front', 'car-taxi-front', 'bus', 'bus-front', 'fuel', 'plane', 'bike', 'truck',
      'tractor', 'ship', 'sailboat', 'train-front',
    ],
  },
  {
    label: 'Comida y compras',
    icons: [
      'utensils', 'chef-hat', 'pizza', 'sandwich', 'salad', 'soup', 'beef', 'fish', 'egg',
      'croissant', 'cookie', 'ice-cream-cone', 'coffee', 'wine', 'shopping-cart', 'shopping-bag',
      'apple', 'beer', 'cake', 'store',
    ],
  },
  {
    label: 'Ocio',
    icons: [
      'popcorn', 'film', 'clapperboard', 'camera', 'music', 'headphones', 'mic', 'guitar',
      'gamepad-2', 'puzzle', 'tv', 'ticket', 'palette', 'dumbbell', 'luggage',
    ],
  },
  {
    label: 'Salud',
    icons: [
      'heart-pulse', 'pill', 'syringe', 'bandage', 'thermometer', 'stethoscope', 'brain', 'eye',
      'glasses', 'microscope', 'test-tube', 'ambulance', 'hospital',
    ],
  },
  {
    label: 'Educación',
    icons: [
      'graduation-cap', 'school', 'library', 'book-open', 'notebook', 'notebook-pen', 'backpack',
      'pencil', 'highlighter', 'ruler', 'presentation',
    ],
  },
  {
    label: 'Trabajo',
    icons: [
      'award', 'briefcase', 'building', 'building-2', 'warehouse', 'hotel', 'users',
      'user-round', 'badge', 'handshake', 'megaphone', 'network', 'wrench', 'hammer', 'hard-hat',
      'factory', 'shield',
    ],
  },
  {
    label: 'Tecnología',
    icons: [
      'laptop', 'smartphone', 'tablet', 'server', 'database', 'cloud', 'monitor', 'keyboard',
      'mouse', 'headset', 'printer', 'scan', 'qr-code',
    ],
  },
  {
    label: 'Otros',
    icons: [
      'dog', 'cat', 'paw-print', 'bird', 'rabbit', 'bone', 'trees', 'leaf', 'sun', 'baby',
      'gift', 'shirt', 'crown', 'umbrella', 'sparkles', 'scissors',
    ],
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
  boxes: 'Cajas',
  grid: 'Cuadrícula',
  calendar: 'Calendario',
  repeat: 'Recurrente',
  // Dinero
  wallet: 'Billetera',
  banknote: 'Billete',
  coins: 'Monedas',
  'hand-coins': 'Pago en mano',
  'credit-card': 'Tarjeta',
  'piggy-bank': 'Alcancía',
  vault: 'Bóveda',
  receipt: 'Recibo',
  landmark: 'Banco',
  percent: 'Porcentaje',
  'trending-up': 'Subida',
  'trending-down': 'Bajada',
  'file-text': 'Documento',
  calculator: 'Calculadora',
  scale: 'Balanza',
  gavel: 'Mazo',
  // Casa y servicios
  home: 'Casa',
  'door-open': 'Puerta',
  key: 'Llave',
  lightbulb: 'Luz',
  lamp: 'Lámpara',
  plug: 'Enchufe',
  droplet: 'Agua',
  flame: 'Gas',
  wifi: 'Internet',
  phone: 'Teléfono',
  'trash-2': 'Aseo',
  sofa: 'Muebles',
  armchair: 'Poltrona',
  bed: 'Cama',
  bath: 'Baño',
  'shower-head': 'Ducha',
  'washing-machine': 'Lavadora',
  refrigerator: 'Nevera',
  // Transporte
  car: 'Carro',
  'car-front': 'Automóvil',
  'car-taxi-front': 'Taxi',
  bus: 'Bus',
  'bus-front': 'Bus escolar',
  fuel: 'Gasolina',
  plane: 'Avión',
  bike: 'Bicicleta',
  truck: 'Camión',
  tractor: 'Tractor',
  ship: 'Barco',
  sailboat: 'Velero',
  'train-front': 'Tren',
  // Comida y compras
  utensils: 'Restaurante',
  'chef-hat': 'Chef',
  pizza: 'Pizza',
  sandwich: 'Sándwich',
  salad: 'Ensalada',
  soup: 'Sopa',
  beef: 'Carne',
  fish: 'Pescado',
  egg: 'Huevo',
  croissant: 'Panadería',
  cookie: 'Galleta',
  'ice-cream-cone': 'Helado',
  coffee: 'Café',
  wine: 'Vino',
  'shopping-cart': 'Mercado',
  'shopping-bag': 'Compras',
  apple: 'Fruta',
  beer: 'Cerveza',
  cake: 'Pastel',
  store: 'Tienda',
  // Ocio
  popcorn: 'Cine',
  film: 'Película',
  clapperboard: 'Claqueta',
  camera: 'Cámara',
  music: 'Música',
  headphones: 'Audífonos',
  mic: 'Micrófono',
  guitar: 'Guitarra',
  'gamepad-2': 'Videojuegos',
  puzzle: 'Rompecabezas',
  tv: 'Televisión',
  ticket: 'Entrada',
  palette: 'Arte',
  dumbbell: 'Gimnasio',
  luggage: 'Viaje',
  // Salud
  'heart-pulse': 'Salud',
  pill: 'Medicamento',
  syringe: 'Inyección',
  bandage: 'Curación',
  thermometer: 'Termómetro',
  stethoscope: 'Consulta',
  brain: 'Cerebro',
  eye: 'Ojo',
  glasses: 'Gafas',
  microscope: 'Microscopio',
  'test-tube': 'Laboratorio',
  ambulance: 'Ambulancia',
  hospital: 'Hospital',
  // Educación
  'graduation-cap': 'Matrícula',
  school: 'Colegio',
  library: 'Biblioteca',
  'book-open': 'Libro',
  notebook: 'Cuaderno',
  'notebook-pen': 'Apuntes',
  backpack: 'Mochila',
  pencil: 'Útiles',
  highlighter: 'Resaltador',
  ruler: 'Regla',
  presentation: 'Presentación',
  // Trabajo
  award: 'Reconocimiento',
  briefcase: 'Maletín',
  building: 'Edificio',
  'building-2': 'Empresa',
  warehouse: 'Bodega',
  hotel: 'Hotel',
  users: 'Equipo',
  'user-round': 'Persona',
  badge: 'Credencial',
  handshake: 'Acuerdo',
  megaphone: 'Publicidad',
  network: 'Red',
  wrench: 'Mantenimiento',
  hammer: 'Obra',
  'hard-hat': 'Casco',
  factory: 'Fábrica',
  shield: 'Seguro',
  // Tecnología
  laptop: 'Computador',
  smartphone: 'Celular',
  tablet: 'Tableta',
  server: 'Servidor',
  database: 'Base de datos',
  cloud: 'Nube',
  monitor: 'Pantalla',
  keyboard: 'Teclado',
  mouse: 'Ratón',
  headset: 'Diadema',
  printer: 'Impresora',
  scan: 'Escáner',
  'qr-code': 'Código QR',
  // Otros
  dog: 'Perro',
  cat: 'Gato',
  'paw-print': 'Huella',
  bird: 'Ave',
  rabbit: 'Conejo',
  bone: 'Hueso',
  trees: 'Árboles',
  leaf: 'Jardín',
  sun: 'Sol',
  baby: 'Bebé',
  gift: 'Regalo',
  shirt: 'Ropa',
  crown: 'Corona',
  umbrella: 'Sombrilla',
  sparkles: 'Brillo',
  scissors: 'Peluquería',
}

/**
 * Cómo se llama cada color. Es lo que lee un lector de pantalla en la muestra
 * —un círculo de color sin nombre no dice nada (§46)— y lo que sale al pasar por
 * encima.
 */
export const COLOR_LABELS: Record<ColorKey, string> = {
  slate: 'Pizarra',
  gray: 'Gris',
  zinc: 'Grafito',
  neutral: 'Gris neutro',
  stone: 'Piedra',
  red: 'Rojo',
  orange: 'Naranja',
  amber: 'Ámbar',
  yellow: 'Amarillo',
  lime: 'Lima',
  green: 'Verde',
  emerald: 'Esmeralda',
  teal: 'Verde azulado',
  cyan: 'Cian',
  sky: 'Celeste',
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
