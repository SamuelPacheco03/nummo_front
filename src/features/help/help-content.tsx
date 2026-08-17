import { Card } from '@/components/ui/card'
import { Note } from '@/components/ui/note'
import { Block, DefList, Flow, GoTo, P, StateList, T } from './help-ui'
import {
  ACUERDO_STATES,
  CUENTA_STATES,
  DOC_STATES,
  EXPENSE_KINDS,
  GLOSSARY,
  KPIS,
  PAYMENT_KINDS,
  ROLES,
  STEPS,
  termsOf,
} from './help-data'

/**
 * El texto de la guía, un componente por tema. Solo componentes: quién es cada
 * tema y en qué orden van lo dice `topics.ts`.
 */

export function ComoFunciona() {
  return (
    <>
      <P>
        Nummo lleva el control de <T>lo que te deben</T> (cartera), <T>lo que debes</T> (gastos) y{' '}
        <T>tu dinero</T> (caja). Registras poco —o dejas que se genere solo— y el <T>Panel</T> y los{' '}
        <T>Informes</T> te muestran cómo va el negocio.
      </P>

      <Block id="dos-caras" title="Dos caras de lo mismo">
        <P>
          Cobrar y pagar funcionan igual, en espejo. Si entiendes uno, entiendes el otro: cambian las
          palabras y la dirección del dinero.
        </P>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="space-y-3 p-4">
            <div className="font-medium">Lo que te deben</div>
            <Flow steps={['Acuerdo', 'Cuenta por cobrar', 'Pago', 'Caja']} />
          </Card>
          <Card className="space-y-3 p-4">
            <div className="font-medium">Lo que debes</div>
            <Flow steps={['Gasto recurrente', 'Cuenta por pagar', 'Egreso', 'Caja']} />
          </Card>
        </div>
        <P>
          Todo pago y todo egreso mueve una <T>cuenta de caja</T>. Entre tus cuentas puedes{' '}
          <T>transferir</T> sin que cambie tu neto: el dinero solo cambia de sitio.
        </P>
      </Block>

      <Block id="organizacion" title="Dónde vive lo que registras">
        <P>
          Todo pertenece a la <T>organización activa</T> —la del selector de arriba a la izquierda—, y
          dentro de ella puedes tener varias <T>sedes</T>. Quién ve y quién toca cada cosa lo decide su{' '}
          <T>rol</T>.
        </P>
        <Note tone="info">
          Si algo «no aparece», lo primero que hay que mirar es qué organización está activa: los datos
          de una no se ven desde la otra.
        </Note>
      </Block>
    </>
  )
}

export function PrimerosPasos() {
  return (
    <>
      <P>
        Seis pasos, en este orden. Los dos primeros se hacen una vez; del tercero en adelante es el día
        a día.
      </P>

      <ol className="space-y-3">
        {STEPS.map((s) => (
          <li key={s.n}>
            <Card className="flex gap-4 p-4">
              <span className="nums bg-secondary grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold">
                {s.n}
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <h3 className="flex items-center gap-2 font-medium">
                  <s.Icon aria-hidden className="text-brand size-4 shrink-0" />
                  {s.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.body}</p>
                <GoTo to={s.to} className="pt-1">
                  {s.cta}
                </GoTo>
              </div>
            </Card>
          </li>
        ))}
      </ol>

      <Block id="trucos" title="Cuatro cosas que ahorran tiempo">
        <Note tone="tip" title="Los montos se escriben solo con números">
          Los miles se separan solos (1.465.775) y la <T>coma</T> es para decimales. Puedes pegar un
          valor con puntos y Nummo lo entiende.
        </Note>
        <Note tone="tip" title="El botón Automático reparte por ti">
          Al registrar un pago o un egreso, reparte el monto entre las cuentas abiertas del contacto,
          de la más antigua a la más nueva.
        </Note>
        <Note tone="info" title="La (i) junto a un campo explica ese dato">
          Si un campo no te queda claro, la respuesta está ahí mismo y no aquí.
        </Note>
        <Note tone="info" title="Nada se borra de verdad">
          Lo que dejas de usar se archiva (contactos) o se marca inactivo (catálogos): sale de los
          formularios pero conserva su historial.
        </Note>
      </Block>
    </>
  )
}

export function Cobrar() {
  return (
    <>
      <P>
        La cartera es todo lo que te deben. Un <T>acuerdo</T> genera las cuentas de cada período, y
        cuando alguien paga registras un <T>pago</T> y lo aplicas a esas cuentas.
      </P>
      <Flow steps={['Acuerdo', 'Cuenta por cobrar', 'Pago', 'Caja']} />
      <P>
        No necesitas acuerdos para empezar: puedes crear cuentas por cobrar sueltas. El acuerdo es para
        lo que se repite todos los meses.
      </P>

      <Block id="tipos-de-pago" title="Los tres tipos de pago">
        <P>Al registrar un pago eliges su tipo, arriba del formulario:</P>
        <DefList items={PAYMENT_KINDS} />
        <Note tone="tip">
          El botón <T>Automático</T> reparte el monto entre las cuentas abiertas del pagador, de la más
          antigua a la más nueva.
        </Note>
      </Block>

      <Block id="mora" title="Cuando una cuenta se vence">
        <P>
          Una cuenta vencida puede generar <T>mora</T> si tiene una política de interés asociada. La
          mora no se calcula sola: se <T>causa</T> cuando lo pides, según las reglas de cada política
          —tasa, días de gracia y topes—. Y si decides no cobrarla, se <T>condona</T>.
        </P>
        <GoTo to="/cartera/interes">Ver políticas de interés</GoTo>
      </Block>

      <Block id="terminos-cartera" title="Términos que verás aquí">
        <DefList items={termsOf('cobrar')} />
      </Block>

      <div className="flex flex-wrap gap-4">
        <GoTo to="/cartera/cxc">Ir a Cuentas por cobrar</GoTo>
        <GoTo to="/cartera/pagos">Ir a Pagos</GoTo>
      </div>
    </>
  )
}

export function Pagar() {
  return (
    <>
      <P>
        Los gastos son el espejo de la cartera: lo que debes. Un <T>gasto recurrente</T> genera las
        cuentas por pagar de cada período, y cuando pagas registras un <T>egreso</T> y lo aplicas.
      </P>
      <Flow steps={['Gasto recurrente', 'Cuenta por pagar', 'Egreso', 'Caja']} />
      <P>
        Igual que en cartera, no hace falta un recurrente para registrar una cuenta por pagar suelta.
      </P>

      <Block id="tipos-de-egreso" title="Los tres tipos de egreso">
        <DefList items={EXPENSE_KINDS} />
        <Note tone="info">
          Son los mismos tres del lado de cobrar, cambiando la dirección del dinero: si aprendiste uno,
          ya sabes el otro.
        </Note>
      </Block>

      <Block id="terminos-gastos" title="Términos que verás aquí">
        <DefList items={termsOf('pagar')} />
      </Block>

      <div className="flex flex-wrap gap-4">
        <GoTo to="/gastos/cxp">Ir a Cuentas por pagar</GoTo>
        <GoTo to="/gastos/egresos">Ir a Egresos</GoTo>
      </div>
    </>
  )
}

export function Caja() {
  return (
    <>
      <P>
        La caja es dónde está tu dinero: efectivo, bancos, billeteras. No se escribe a mano — cada{' '}
        <T>saldo</T> se calcula desde los movimientos que lo formaron.
      </P>
      <Flow steps={['Pago o egreso', 'Movimiento', 'Saldo de la cuenta']} />

      <Block id="transferencias" title="Mover dinero entre tus cuentas">
        <P>
          Una <T>transferencia</T> saca de una cuenta y mete en otra. Genera dos movimientos, uno de
          salida y otro de entrada.
        </P>
        <Note tone="info" title="Una transferencia no es un ingreso ni un egreso">
          No cambia tu neto del período: el dinero ya era tuyo y sigue siéndolo. Por eso no aparece en
          Ingresos ni en Egresos de los informes.
        </Note>
      </Block>

      <Block id="terminos-caja" title="Términos que verás aquí">
        <DefList items={termsOf('caja')} />
      </Block>

      <div className="flex flex-wrap gap-4">
        <GoTo to="/caja/cuentas">Ir a Cuentas</GoTo>
        <GoTo to="/caja/movimientos">Ir a Movimientos</GoTo>
      </div>
    </>
  )
}

export function Informes() {
  return (
    <>
      <P>
        El <T>Panel</T> responde «¿cómo voy hoy?» y los <T>Informes</T> responden «¿cómo fue este
        período?». Los dos usan las mismas cifras; cambia el alcance.
      </P>

      <Block id="cifras" title="Qué significa cada cifra">
        <DefList items={KPIS} />
      </Block>

      <Block id="que-trae" title="Qué encontrarás">
        <P>
          El resultado del período —ingresos, egresos y neto, comparados con el período anterior—,
          la tendencia de los últimos seis meses, de dónde salió cada peso y en qué se fue, cómo
          está la cartera hoy por antigüedad, y lo que tienes comprometido cada mes según tus
          acuerdos y gastos recurrentes.
        </P>
        <Note tone="info">
          Los desgloses se exportan a CSV con <T>todas</T> las filas, también las que la gráfica
          agrupa en «Otros».
        </Note>
      </Block>

      <GoTo to="/informes/resultados">Ir a Informes</GoTo>
    </>
  )
}

export function Estados() {
  return (
    <>
      <P>
        El color y la etiqueta de cada fila dicen en qué punto está. Estos son todos los estados que
        existen.
      </P>
      <StateList title="Cuentas por cobrar y por pagar" states={CUENTA_STATES} />
      <Note tone="info">
        En gastos verás el mismo estado en masculino: Vencido, Pagado, Cancelado, Castigado.
      </Note>
      <StateList title="Acuerdos y gastos recurrentes" states={ACUERDO_STATES} />
      <StateList title="Pagos y egresos" states={DOC_STATES} />
    </>
  )
}

export function Roles() {
  return (
    <>
      <P>
        Cada miembro de la organización tiene un rol, y el rol decide qué puede hacer. Van de más a
        menos permisos.
      </P>
      <DefList items={ROLES} />
      <Note tone="info">
        Un mismo usuario puede tener roles distintos en dos organizaciones: el rol es de la
        organización, no de la persona.
      </Note>
      <GoTo to="/config/miembros">Ir a Miembros</GoTo>
    </>
  )
}

export function Glosario() {
  return (
    <>
      <P>Todas las palabras que usa Nummo, agrupadas por tema. Sin tecnicismos.</P>
      {GLOSSARY.map((g) => (
        <div key={g.group} className="space-y-2">
          <h3 className="text-sm font-medium">{g.group}</h3>
          <DefList items={g.terms} />
        </div>
      ))}
    </>
  )
}
