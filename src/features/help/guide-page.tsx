import { type ReactNode } from 'react'
import { Link } from 'react-router'
import {
  ArrowLeftRight,
  ArrowRight,
  Banknote,
  BarChart3,
  BookOpen,
  Building2,
  CircleDot,
  Coins,
  FileText,
  Lightbulb,
  ListChecks,
  ShieldCheck,
  Tags,
  Users,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { KnowledgeSearch } from './knowledge-search'

/* ── Índice ───────────────────────────────────────────────────────────── */
const TOC: { id: string; label: string }[] = [
  { id: 'que-es', label: '¿Qué es Nummo?' },
  { id: 'pasos', label: 'Primeros pasos' },
  { id: 'flujo', label: 'Cómo fluye el dinero' },
  { id: 'tipos', label: 'Tipos de pago y egreso' },
  { id: 'estados', label: 'Estados' },
  { id: 'indicadores', label: 'Indicadores' },
  { id: 'glosario', label: 'Glosario' },
  { id: 'roles', label: 'Roles y permisos' },
  { id: 'consejos', label: 'Consejos' },
]

/* ── Primeros pasos ───────────────────────────────────────────────────── */
type Step = { n: number; Icon: LucideIcon; title: string; body: string; to?: string; cta?: string }
const STEPS: Step[] = [
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

/* ── Tipos de pago y de egreso ────────────────────────────────────────── */
const PAYMENT_KINDS: { term: string; def: string }[] = [
  { term: 'Abono a cuenta', def: 'Un pago que aplicas a una o varias cuentas por cobrar que ya existen del pagador. Es lo más común.' },
  { term: 'Anticipo', def: 'Recibes dinero sin una deuda asociada aún: queda como crédito a favor del pagador y luego lo aplicas a cuentas cuando existan.' },
  { term: 'Ingreso directo', def: 'Un cobro que entra directo contra un concepto, sin pasar por una cuenta por cobrar. Para ingresos sueltos o de una sola vez (una venta ocasional, una donación…).' },
]
const EXPENSE_KINDS: { term: string; def: string }[] = [
  { term: 'Pago de gasto', def: 'Un egreso que aplicas a una o varias cuentas por pagar que ya existen del proveedor.' },
  { term: 'Anticipo', def: 'Entregas dinero sin una deuda asociada aún: queda como crédito a tu favor con el proveedor y luego lo aplicas.' },
  { term: 'Egreso directo', def: 'Un pago que sale directo contra una categoría, sin cuenta por pagar previa. Para gastos sueltos o de una sola vez.' },
]

/* ── Estados ──────────────────────────────────────────────────────────── */
type State = { label: string; tone: StatusTone; def: string }

const CUENTA_STATES: State[] = [
  { label: 'Pendiente', tone: 'muted', def: 'Creada y todavía no vencida; aún no tiene abonos.' },
  { label: 'Parcial', tone: 'warning', def: 'Ya recibió abonos, pero todavía queda saldo por cubrir.' },
  {
    label: 'Vencida',
    tone: 'destructive',
    def: 'Pasó su fecha de vencimiento y aún tiene saldo. Es la que “se te pasó de fecha”; si tiene política de interés, puede generar mora.',
  },
  { label: 'Pagada', tone: 'success', def: 'Su saldo llegó a cero: quedó totalmente cubierta.' },
  { label: 'Cancelada', tone: 'muted', def: 'Anulada antes de pagarse; deja de contar en la cartera.' },
  {
    label: 'Castigada',
    tone: 'muted',
    def: 'Se da por incobrable y se saca de la cartera activa (write-off contable).',
  },
]

const ACUERDO_STATES: State[] = [
  { label: 'Activo', tone: 'success', def: 'Generando cuentas cada período según su calendario.' },
  { label: 'Pausado', tone: 'warning', def: 'Detenido temporalmente: no genera cuentas hasta reanudarlo.' },
  { label: 'Finalizado', tone: 'muted', def: 'Llegó a su fin (o lo cerraste); ya no genera nada.' },
  { label: 'Cancelado', tone: 'muted', def: 'Anulado.' },
]

const DOC_STATES: State[] = [
  { label: 'Registrado', tone: 'success', def: 'Aplicado y afectando la caja con normalidad.' },
  { label: 'Reversado', tone: 'muted', def: 'Se anuló: revierte sus efectos en saldos y asignaciones.' },
]

/* ── Indicadores del Panel / Informes ─────────────────────────────────── */
const KPIS: { term: string; def: string }[] = [
  { term: 'Ingresos', def: 'Dinero que entró en el período (pagos recibidos).' },
  { term: 'Egresos', def: 'Dinero que salió en el período (pagos que hiciste).' },
  { term: 'Neto', def: 'Ingresos menos egresos. Positivo = entró más de lo que salió.' },
  { term: 'Cartera vencida', def: 'Suma de todo lo que te deben y ya está vencido.' },
  { term: 'Por pagar / Por pagar vencido', def: 'Lo que debes a proveedores; “vencido” es lo que ya pasó su fecha.' },
  { term: 'Saldo por cuenta', def: 'El dinero disponible en cada cuenta de caja/banco, calculado desde sus movimientos.' },
  {
    term: 'Flecha ▲▼ (vs período anterior)',
    def: 'Compara el período elegido con el inmediatamente anterior del mismo tamaño. Verde = mejora, rojo = empeora.',
  },
]

/* ── Glosario ─────────────────────────────────────────────────────────── */
const GLOSSARY: { group: string; terms: { term: string; def: string }[] }[] = [
  {
    group: 'Cartera — lo que te deben',
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

/* ── Roles ────────────────────────────────────────────────────────────── */
const ROLES: { role: string; def: string }[] = [
  { role: 'Propietario', def: 'Control total; único por organización. Gestiona todo, incluida la empresa y los miembros.' },
  { role: 'Administrador', def: 'Gestiona organización, sedes, miembros y catálogos; también opera cartera y gastos.' },
  { role: 'Contador', def: 'Opera cartera, gastos, pagos y acuerdos; no gestiona la organización ni los miembros.' },
  { role: 'Operador', def: 'Registra el día a día (contactos, cobros, pagos); sin acuerdos ni configuración.' },
  { role: 'Lector', def: 'Solo consulta: ve la información sin poder modificarla.' },
]

/* ── Piezas de UI ─────────────────────────────────────────────────────── */
function Section({ id, Icon, title, children }: { id: string; Icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 space-y-4">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
        <Icon className="size-5 text-brand" />
        {title}
      </h2>
      {children}
    </section>
  )
}

function StateList({ title, states }: { title: string; states: State[] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <ul className="divide-y rounded-lg border">
        {states.map((s) => (
          <li key={s.label} className="grid gap-1 p-3 sm:grid-cols-[10rem_1fr] sm:items-baseline sm:gap-4">
            <StatusBadge tone={s.tone} label={s.label} className="font-medium" />
            <span className="text-sm leading-relaxed text-muted-foreground">{s.def}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DefList({ items }: { items: { term: string; def: string }[] }) {
  return (
    <dl className="divide-y rounded-lg border">
      {items.map((it) => (
        <div key={it.term} className="grid gap-1 p-3 sm:grid-cols-[14rem_1fr] sm:gap-4">
          <dt className="font-medium">{it.term}</dt>
          <dd className="text-sm leading-relaxed text-muted-foreground">{it.def}</dd>
        </div>
      ))}
    </dl>
  )
}

export function GuidePage() {
  return (
    <div className="max-w-4xl space-y-10">
      <PageHeader
        title="Guía y ayuda"
        description="Qué es cada cosa, en qué orden usar Nummo y qué significa cada estado. Sin tecnicismos."
      />

      <KnowledgeSearch />

      {/* Índice */}
      <nav className="rounded-lg border bg-muted/30 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <BookOpen className="size-4 text-muted-foreground" />
          En esta página
        </div>
        <ul className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
          {TOC.map((t) => (
            <li key={t.id}>
              <a href={`#${t.id}`} className="text-brand hover:underline">
                {t.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Section id="que-es" Icon={BookOpen} title="¿Qué es Nummo?">
        <p className="leading-relaxed text-muted-foreground">
          Nummo lleva el control de <strong className="text-foreground">lo que te deben</strong> (cartera),{' '}
          <strong className="text-foreground">lo que debes</strong> (gastos) y{' '}
          <strong className="text-foreground">tu dinero</strong> (caja). Registras poco —o dejas que se
          genere solo— y el <strong className="text-foreground">Panel</strong> y los{' '}
          <strong className="text-foreground">Informes</strong> te muestran cómo va el negocio. Está pensado
          para varias empresas y sedes, con acceso por roles.
        </p>
      </Section>

      <Section id="pasos" Icon={ListChecks} title="Primeros pasos">
        <ol className="space-y-3">
          {STEPS.map((s) => (
            <li key={s.n}>
              <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                <div className="flex items-center gap-3 sm:flex-col sm:items-center">
                  <span className="nums grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold">
                    {s.n}
                  </span>
                  <s.Icon className="size-4 text-brand sm:mt-1" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <h3 className="font-medium">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                  {s.to && (
                    <Link to={s.to} className="inline-flex items-center gap-1 pt-1 text-sm font-medium text-brand hover:underline">
                      {s.cta}
                      <ArrowRight className="size-3.5" />
                    </Link>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="flujo" Icon={ArrowLeftRight} title="Cómo fluye el dinero">
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="space-y-2 p-4">
            <div className="font-medium">Cartera — lo que te deben</div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Un <strong className="text-foreground">acuerdo</strong> genera{' '}
              <strong className="text-foreground">cuentas por cobrar</strong> → registras un{' '}
              <strong className="text-foreground">pago</strong> y lo aplicas a esas cuentas. Si una se vence,
              puede generar <strong className="text-foreground">mora</strong>.
            </p>
          </Card>
          <Card className="space-y-2 p-4">
            <div className="font-medium">Gastos — lo que debes</div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Un <strong className="text-foreground">gasto recurrente</strong> genera{' '}
              <strong className="text-foreground">cuentas por pagar</strong> → registras un{' '}
              <strong className="text-foreground">egreso</strong> y lo aplicas. Es el espejo de la cartera.
            </p>
          </Card>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Todo pago y egreso mueve una <strong className="text-foreground">cuenta de caja</strong>; entre tus
          cuentas puedes <strong className="text-foreground">transferir</strong> sin afectar tu neto. El{' '}
          <strong className="text-foreground">Panel</strong> resume el presente y los{' '}
          <strong className="text-foreground">Informes</strong> te dejan analizar por período y exportar.
        </p>
      </Section>

      <Section id="tipos" Icon={Coins} title="Tipos de pago y de egreso">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Al registrar un pago o un egreso eliges su tipo (las pestañas de arriba del formulario):
        </p>
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Al recibir dinero (pago)</h3>
          <DefList items={PAYMENT_KINDS} />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Al pagar dinero (egreso)</h3>
          <DefList items={EXPENSE_KINDS} />
        </div>
      </Section>

      <Section id="estados" Icon={CircleDot} title="Estados">
        <p className="text-sm leading-relaxed text-muted-foreground">
          El color y la etiqueta de cada fila indican su estado. Estos son todos:
        </p>
        <StateList title="Cuentas por cobrar y por pagar" states={CUENTA_STATES} />
        <p className="text-xs text-muted-foreground">
          En gastos verás el mismo estado en masculino (Vencido, Pagado, Cancelado, Castigado).
        </p>
        <StateList title="Acuerdos y gastos recurrentes" states={ACUERDO_STATES} />
        <StateList title="Pagos y egresos" states={DOC_STATES} />
      </Section>

      <Section id="indicadores" Icon={BarChart3} title="Indicadores del Panel e Informes">
        <DefList items={KPIS} />
      </Section>

      <Section id="glosario" Icon={Tags} title="Glosario">
        <div className="space-y-5">
          {GLOSSARY.map((g) => (
            <div key={g.group} className="space-y-2">
              <h3 className="text-sm font-medium">{g.group}</h3>
              <DefList items={g.terms} />
            </div>
          ))}
        </div>
      </Section>

      <Section id="roles" Icon={ShieldCheck} title="Roles y permisos">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Cada miembro de la organización tiene un rol que define qué puede hacer:
        </p>
        <DefList items={ROLES.map((r) => ({ term: r.role, def: r.def }))} />
      </Section>

      <Section id="consejos" Icon={Lightbulb} title="Consejos">
        <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li className="flex gap-2">
            <span className="text-brand">•</span>
            <span>
              <strong className="text-foreground">Montos:</strong> escribe solo números; los miles se separan
              solos (1.465.775) y la <strong className="text-foreground">coma</strong> es para decimales.
              Puedes pegar un valor con puntos y Nummo lo entiende.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-brand">•</span>
            <span>
              El ícono <span className="inline-flex size-4 translate-y-0.5 items-center justify-center rounded-full border text-[0.6rem]">i</span>{' '}
              junto a un campo explica qué significa ese dato.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-brand">•</span>
            <span>
              Al registrar un pago o egreso, el botón <strong className="text-foreground">Automático</strong>{' '}
              reparte el monto entre las cuentas abiertas del contacto.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-brand">•</span>
            <span>
              Lo que ya no uses no se borra: se <strong className="text-foreground">archiva</strong> (contactos)
              o se marca inactivo (catálogos), para no perder el historial.
            </span>
          </li>
        </ul>
      </Section>
    </div>
  )
}
