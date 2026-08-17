import { BarChart3, Banknote, Building2, FileText, Users, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { State } from './help-ui'

/**
 * Los datos de la guía: glosario, pasos, estados y cifras.
 *
 * Separados del contenido (`help-content.tsx`) porque los lee más de uno: las
 * páginas los pintan y `searchGuide` los busca. Y separados también porque un
 * archivo que exporta datos **y** declara componentes rompe el recargado en
 * caliente de Vite —el lint lo avisa— además de mezclar dos cosas que se editan
 * en momentos distintos.
 */

/* ══ Datos ═══════════════════════════════════════════════════════════════ */

export type Term = { term: string; def: string }

/**
 * El glosario, agrupado por el tema al que pertenece cada término.
 *
 * `slug` es lo que permite que un término se escriba **una vez** y aparezca en
 * dos sitios: en su tema, donde hace falta mientras se lee, y en el glosario
 * completo, que es una tabla de consulta. Sin eso volveríamos a mantener dos
 * listas que se separan a la primera corrección.
 */
export const GLOSSARY: { group: string; slug?: string; terms: Term[] }[] = [
  {
    group: 'Cartera — lo que te deben',
    slug: 'cobrar',
    terms: [
      { term: 'Cartera', def: 'El conjunto de todo lo que te deben tus clientes.' },
      {
        term: 'Cuenta por cobrar (CxC)',
        def: 'Una deuda concreta a tu favor, con su vencimiento y saldo. Ej.: la mensualidad de agosto de María.',
      },
      { term: 'Pagador', def: 'El contacto que debe pagar una cuenta o un acuerdo.' },
      {
        term: 'Beneficiario',
        def: 'Opcional: la persona a nombre de quien va el cobro (p. ej. el estudiante), distinta del pagador.',
      },
      {
        term: 'Acuerdo',
        def: 'Plantilla de cobro recurrente: genera una cuenta por cobrar cada período (mensualidad, plan…).',
      },
      {
        term: 'Generar mensualidades',
        def: 'Crear de una vez las cuentas por cobrar que ya tocan según los acuerdos activos.',
      },
      { term: 'Abono', def: 'Un pago, total o parcial, que reduce el saldo de una cuenta por cobrar.' },
    ],
  },
  {
    group: 'Gastos — lo que debes',
    slug: 'pagar',
    terms: [
      { term: 'Cuenta por pagar (CxP)', def: 'Una obligación tuya con un proveedor, con vencimiento y saldo.' },
      { term: 'Proveedor', def: 'El contacto al que le pagas.' },
      {
        term: 'Gasto recurrente',
        def: 'La versión de gasto del acuerdo: genera una cuenta por pagar cada período (arriendo, servicios…).',
      },
      { term: 'Egreso', def: 'Un pago que haces; puede aplicarse a una o varias cuentas por pagar.' },
      {
        term: 'Categoría de gasto',
        def: 'Clasificación del gasto (arriendo, nómina, servicios…) para agruparlo en los informes.',
      },
    ],
  },
  {
    group: 'Caja y dinero',
    slug: 'caja',
    terms: [
      {
        term: 'Cuenta',
        def: 'Dónde está el dinero: Caja (efectivo), Banco, Billetera digital u Otro. Sus saldos se calculan desde los movimientos.',
      },
      {
        term: 'Saldo',
        def: 'Lo que queda: en una cuenta por cobrar es lo que falta cobrar; en una cuenta de caja es el dinero disponible.',
      },
      { term: 'Saldo inicial', def: 'El dinero con el que arranca una cuenta cuando la creas.' },
      {
        term: 'Movimiento',
        def: 'Cada entrada o salida de una cuenta. Tipos: Pago, Egreso, Transferencia (entra/sale), Ajuste y Reversión.',
      },
      {
        term: 'Transferencia',
        def: 'Mover dinero entre tus cuentas. No cambia tu ingreso/egreso neto: solo traslada saldo.',
      },
      {
        term: 'Método de pago',
        def: 'Cómo se movió el dinero: Efectivo, Transferencia, Tarjeta, Billetera u Otro.',
      },
      {
        term: 'Anticipo (crédito)',
        def: 'Dinero recibido o entregado sin una deuda asociada aún. Queda como crédito y luego lo aplicas a cuentas concretas.',
      },
      {
        term: 'Aplicar / Asignar',
        def: 'Distribuir un pago (o un anticipo) entre una o varias cuentas por cobrar/pagar.',
      },
      { term: 'Reversar', def: 'Anular un pago o egreso: revierte sus efectos en saldos y asignaciones.' },
    ],
  },
  {
    group: 'Mora e interés',
    slug: 'cobrar',
    terms: [
      { term: 'Mora', def: 'El interés que se cobra cuando una cuenta por cobrar se vence.' },
      {
        term: 'Causar mora',
        def: 'Calcular y sumar el interés a las cuentas vencidas, según la política de cada una.',
      },
      {
        term: 'Política de interés',
        def: 'Las reglas de la mora: método de cálculo, tasa, días de gracia, base y topes.',
      },
      { term: 'Días de gracia', def: 'Días de tolerancia tras el vencimiento antes de empezar a cobrar mora.' },
      { term: 'Condonar', def: 'Perdonar, total o parcialmente, el interés de mora ya causado.' },
      {
        term: 'Ajuste',
        def: 'Un cambio manual al saldo de una cuenta: Descuento, Cargo manual o Abono manual.',
      },
    ],
  },
  {
    group: 'Organización',
    terms: [
      {
        term: 'Organización',
        def: 'Tu empresa dentro de Nummo. Todos los datos viven en la organización activa (la del selector, arriba a la izquierda).',
      },
      { term: 'Sede', def: 'Una ubicación o sucursal de la organización. Opcional al crear cuentas o acuerdos.' },
      {
        term: 'Contacto',
        def: 'Una persona o empresa con la que tienes movimientos: puede ser pagador y/o proveedor.',
      },
      { term: 'Miembro / Rol', def: 'Las personas con acceso a la organización y qué pueden hacer (ver Roles).' },
      { term: 'Moneda', def: 'La divisa de los montos (por defecto COP). Se muestra como prefijo: COP 1.000.' },
    ],
  },
]

/** Los términos de un tema, para pintarlos donde hacen falta. */
export function termsOf(slug: string): Term[] {
  return GLOSSARY.filter((g) => g.slug === slug).flatMap((g) => g.terms)
}

type Step = { n: number; Icon: LucideIcon; title: string; body: string; to: string; cta: string }

export const STEPS: Step[] = [
  {
    n: 1,
    Icon: Building2,
    title: 'Prepara tu organización',
    body: 'Revisa los datos de la empresa y crea las sedes si trabajas en varios lugares. Todo lo que registres vive dentro de la organización activa (la ves arriba a la izquierda).',
    to: '/config/empresa',
    cta: 'Ir a Empresa',
  },
  {
    n: 2,
    Icon: Wallet,
    title: 'Configura tus catálogos',
    body: 'Son las listas base que reutilizarás: conceptos de cobro (mensualidad, matrícula…), categorías de gasto, métodos de pago y cuentas (caja, bancos). Los encuentras en Configuración › Catálogos. Con esto listo, todo lo demás es más rápido.',
    to: '/maestros/conceptos',
    cta: 'Ir a Catálogos',
  },
  {
    n: 3,
    Icon: Users,
    title: 'Agrega tus contactos',
    body: 'Personas o empresas con las que tienes movimientos: clientes que te pagan (pagadores) y proveedores a los que pagas.',
    to: '/contactos',
    cta: 'Ir a Contactos',
  },
  {
    n: 4,
    Icon: FileText,
    title: 'Automatiza lo que se repite',
    body: 'Crea acuerdos (ingresos recurrentes, p. ej. una mensualidad) y gastos recurrentes (arriendo, servicios). Nummo genera solo las cuentas por cobrar y por pagar de cada mes.',
    to: '/cartera/acuerdos',
    cta: 'Ir a Acuerdos',
  },
  {
    n: 5,
    Icon: Banknote,
    title: 'Registra el día a día',
    body: 'Cuando alguien te paga, registra un pago y aplícalo a sus cuentas por cobrar (hay un botón Automático). Cuando pagas algo, registra un egreso. La caja se actualiza sola.',
    to: '/cartera/pagos',
    cta: 'Ir a Pagos',
  },
  {
    n: 6,
    Icon: BarChart3,
    title: 'Revisa Panel e Informes',
    body: 'El Panel resume tu situación de un vistazo. En Informes profundizas por período y exportas a CSV (resultados, cartera, deudores, próximos vencimientos).',
    to: '/informes/resultados',
    cta: 'Ir a Informes',
  },
]

export const PAYMENT_KINDS: Term[] = [
  { term: 'Abono a cuenta', def: 'Un pago que aplicas a una o varias cuentas por cobrar que ya existen del pagador. Es lo más común.' },
  { term: 'Anticipo', def: 'Recibes dinero sin una deuda asociada aún: queda como crédito a favor del pagador y luego lo aplicas a cuentas cuando existan.' },
  { term: 'Ingreso directo', def: 'Un cobro que entra directo contra un concepto, sin pasar por una cuenta por cobrar. Para ingresos sueltos o de una sola vez (una venta ocasional, una donación…).' },
]

export const EXPENSE_KINDS: Term[] = [
  { term: 'Pago de gasto', def: 'Un egreso que aplicas a una o varias cuentas por pagar que ya existen del proveedor.' },
  { term: 'Anticipo', def: 'Entregas dinero sin una deuda asociada aún: queda como crédito a tu favor con el proveedor y luego lo aplicas.' },
  { term: 'Egreso directo', def: 'Un pago que sale directo contra una categoría, sin cuenta por pagar previa. Para gastos sueltos o de una sola vez.' },
]

export const CUENTA_STATES: State[] = [
  { label: 'Pendiente', tone: 'muted', def: 'Creada y todavía no vencida; aún no tiene abonos.' },
  { label: 'Parcial', tone: 'warning', def: 'Ya recibió abonos, pero todavía queda saldo por cubrir.' },
  {
    label: 'Vencida',
    tone: 'destructive',
    def: 'Pasó su fecha de vencimiento y aún tiene saldo. Es la que «se te pasó de fecha»; si tiene política de interés, puede generar mora.',
  },
  { label: 'Pagada', tone: 'success', def: 'Su saldo llegó a cero: quedó totalmente cubierta.' },
  { label: 'Cancelada', tone: 'muted', def: 'Anulada antes de pagarse; deja de contar en la cartera.' },
  {
    label: 'Castigada',
    tone: 'muted',
    def: 'Se da por incobrable y se saca de la cartera activa (write-off contable).',
  },
]

export const ACUERDO_STATES: State[] = [
  { label: 'Activo', tone: 'success', def: 'Generando cuentas cada período según su calendario.' },
  { label: 'Pausado', tone: 'warning', def: 'Detenido temporalmente: no genera cuentas hasta reanudarlo.' },
  { label: 'Finalizado', tone: 'muted', def: 'Llegó a su fin (o lo cerraste); ya no genera nada.' },
  { label: 'Cancelado', tone: 'muted', def: 'Anulado.' },
]

export const DOC_STATES: State[] = [
  { label: 'Registrado', tone: 'success', def: 'Aplicado y afectando la caja con normalidad.' },
  { label: 'Reversado', tone: 'muted', def: 'Se anuló: revierte sus efectos en saldos y asignaciones.' },
]

export const KPIS: Term[] = [
  { term: 'Ingresos', def: 'Dinero que entró en el período (pagos recibidos).' },
  { term: 'Egresos', def: 'Dinero que salió en el período (pagos que hiciste).' },
  { term: 'Neto', def: 'Ingresos menos egresos. Positivo = entró más de lo que salió.' },
  { term: 'Cartera vencida', def: 'Suma de todo lo que te deben y ya está vencido.' },
  { term: 'Por pagar / Por pagar vencido', def: 'Lo que debes a proveedores; «vencido» es lo que ya pasó su fecha.' },
  { term: 'Saldo por cuenta', def: 'El dinero disponible en cada cuenta de caja/banco, calculado desde sus movimientos.' },
  {
    term: 'Flecha ▲▼ (vs período anterior)',
    def: 'Compara el período elegido con el inmediatamente anterior del mismo tamaño. Verde = mejora, rojo = empeora.',
  },
]

export const ROLES: Term[] = [
  { term: 'Propietario', def: 'Control total; único por organización. Gestiona todo, incluida la empresa y los miembros.' },
  { term: 'Administrador', def: 'Gestiona organización, sedes, miembros y catálogos; también opera cartera y gastos.' },
  { term: 'Contador', def: 'Opera cartera, gastos, pagos y acuerdos; no gestiona la organización ni los miembros.' },
  { term: 'Operador', def: 'Registra el día a día (contactos, cobros, pagos); sin acuerdos ni configuración.' },
  { term: 'Lector', def: 'Solo consulta: ve la información sin poder modificarla.' },
]
