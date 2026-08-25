import { Field } from '@/components/ui/field'
import { NativeSelect } from '@/components/ui/native-select'
import { StatusBadge } from '@/components/ui/status-badge'
import type { WhatsAppTemplate } from '@/api/generated/model'
import { parameterLabel, paymentAwareUpgrade, saysWherePay } from './labels'

/**
 * Un desplegable de plantillas con **el hueco nombrado**.
 *
 * «Sin plantilla no hay aviso» es una regla del backend, no un detalle: con
 * `overdueTemplateKey` en `null` los vencidos no se avisan aunque `enabled` sea
 * `true`. Un `<select>` vacío no cuenta eso —se lee como «todavía no lo he
 * elegido»—, así que el estado se dice con palabras justo debajo.
 *
 * Y una plantilla que no puede enviar (`canSend: false`) se ofrece igual pero
 * marcada: es exactamente la que produce un `template_not_approved` en el
 * historial, y esconderla dejaría sin explicar por qué no llegó nada.
 */
export function TemplateField({
  id,
  label,
  emptyWarning,
  emptyTone = 'warning',
  templates,
  value,
  disabled,
  onChange,
  onFocus,
}: {
  id: string
  label: string
  emptyWarning: string
  /**
   * Qué pesa el hueco. Sin plantilla de «por vencer» o de mora **ese aviso no
   * sale**, y eso es ámbar; sin la de resumen el aviso sale igual, solo que sin
   * el conteo — degradar no es fallar, así que no gasta el ámbar (§7).
   */
  emptyTone?: 'warning' | 'muted'
  templates: WhatsAppTemplate[]
  value: string
  disabled: boolean
  onChange: (value: string) => void
  /** Tocar un aviso lo pone en la vista previa: se mira lo que se está cambiando. */
  onFocus?: () => void
}) {
  const chosen = templates.find((t) => t.templateKey === value)
  const conDatos = templates.filter(saysWherePay)
  const sinDatos = templates.filter((t) => !saysWherePay(t))
  /*
    Solo cuando ya está aprobada: mientras Meta la revisa no hay nada que hacer y
    el aviso sería ruido durante horas. El repunte es un acto del usuario —el
    backend no cambia la política solo— y hasta ahora nadie se lo iba a explicar.
  */
  const repunte = paymentAwareUpgrade(value, templates)
  // La clave guardada puede no estar en el catálogo: una plantilla borrada, o el
  // permiso de leerlas que no se tiene. No se pierde el valor por eso.
  const unknown = value !== '' && templates.length > 0 && !chosen

  return (
    <Field label={label} htmlFor={id}>
      <NativeSelect
        id={id}
        value={value}
        disabled={disabled}
        onFocus={onFocus}
        onChange={(event) => {
          onFocus?.()
          onChange(event.target.value)
        }}
      >
        <option value="">Sin plantilla — no se envía este aviso</option>
        {unknown && <option value={value}>{value} (no está en el catálogo)</option>}
        {/*
          Dos generaciones agrupadas, no seis opciones en fila. Las nuevas
          conviven con las viejas en vez de reemplazarlas porque cambiar el texto
          de una plantilla obliga a crearla de nuevo en Meta, y pisar la clave
          existente dejaría la cobranza muda durante las horas de la revisión.
          Sin agrupar, el desplegable se llena y nada dice qué las distingue.
        */}
        {conDatos.length > 0 && (
          <optgroup label="Dicen dónde pagar">
            {conDatos.map((template) => (
              <TemplateOption key={template.templateKey} template={template} />
            ))}
          </optgroup>
        )}
        {sinDatos.length > 0 && (
          <optgroup label="Sin datos de pago">
            {sinDatos.map((template) => (
              <TemplateOption key={template.templateKey} template={template} />
            ))}
          </optgroup>
        )}
      </NativeSelect>

      {/*
        El repunte es un acto del usuario: el backend no cambia la política solo.
        Sin esto, quien tenga la vieja puesta se encontraría seis opciones en el
        desplegable y ninguna pista de que hay una mejor ya lista.
      */}
      {repunte && (
        <p className="text-xs">
          <button
            type="button"
            className="text-brand underline"
            disabled={disabled}
            onClick={() => onChange(repunte.templateKey)}
          >
            Hay una versión que dice dónde pagar, y ya está aprobada. Usarla
          </button>
        </p>
      )}

      {value === '' ? (
        <p
          className={
            emptyTone === 'warning' ? 'text-warning-strong text-xs' : 'text-muted-foreground text-xs'
          }
        >
          {emptyWarning}
        </p>
      ) : chosen && !chosen.canSend ? (
        <p className="text-warning-strong text-xs">
          Meta todavía no la aprobó, así que este aviso no sale hasta que lo haga.
        </p>
      ) : chosen ? (
        <div className="flex items-center gap-2 text-xs">
          <StatusBadge tone="success" label="Lista para enviar" />
          {chosen.parameterNames.length > 0 && (
            <span className="text-muted-foreground">
              Usa: {chosen.parameterNames.map(parameterLabel).join(', ')}
            </span>
          )}
        </div>
      ) : null}
    </Field>
  )
}

/** Una plantilla en el desplegable, con lo único que impide elegirla bien. */
function TemplateOption({ template }: { template: WhatsAppTemplate }) {
  return (
    <option value={template.templateKey}>
      {/*
        `displayName` primero: `name` es como se llama la plantilla **en Meta**
        —`cobro_vencido`— y en un desplegable en español no dice nada. Cae a
        `name` porque el contrato lo firma nulable, y una opción sin texto es
        peor que una con la clave cruda.
      */}
      {template.displayName ?? template.name}
      {/* `canSend` viene calculado: no se deduce del `status`. */}
      {template.canSend ? '' : ' — todavía no se puede enviar'}
    </option>
  )
}
