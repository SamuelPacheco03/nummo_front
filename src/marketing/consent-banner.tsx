import { useEffect, useState } from 'react'
import {
  cargarClarity,
  clarityId,
  guardarConsentimiento,
  hayQuePreguntar,
  type Consentimiento,
} from './consent'

/**
 * El aviso de medición.
 *
 * **Por defecto no carga nada.** Aparece solo si hay algo de terceros configurado y esta
 * persona no ha elegido todavía; y hasta que elige «sí», Clarity no existe en la página.
 *
 * Las dos opciones pesan lo mismo a la vista. Un «rechazar» escondido en gris claro al
 * lado de un «aceptar» grande y de color no es una elección, es un embudo — y la medición
 * propia no depende de esta respuesta, así que no hay nada que empujar.
 */
export function ConsentBanner() {
  /*
    Empieza oculto y decide DESPUÉS de montar, no durante el render. Dos razones y las dos
    valen: la portada se prerenderiza en Node, donde no hay `localStorage` ni visitante que
    haya elegido nada —el aviso acabaría incrustado en el HTML que leen los rastreadores—;
    y aunque no se prerenderizara, si esta persona ya respondió no tiene por qué ver el
    aviso parpadear antes de desaparecer.
  */
  const [visible, setVisible] = useState(false)

  useEffect(() => setVisible(hayQuePreguntar()), [])

  function responder(valor: Consentimiento) {
    guardarConsentimiento(valor)
    setVisible(false)
    if (valor === 'si') {
      const id = clarityId()
      if (id) cargarClarity(id)
    }
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Medición y privacidad"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-2xl border border-border bg-card p-5 shadow-sm sm:inset-x-auto sm:right-4"
    >
      <p className="text-sm leading-relaxed text-foreground">
        Nos gustaría medir cómo se usa esta página para mejorarla.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Solo si nos dices que sí. Lo que contamos por nuestra cuenta —qué secciones se
        miran— no sale de aquí y no te identifica.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => responder('si')}
          className="inline-flex h-10 flex-1 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          Aceptar
        </button>
        <button
          type="button"
          onClick={() => responder('no')}
          className="inline-flex h-10 flex-1 items-center justify-center rounded-full border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          No, gracias
        </button>
      </div>
    </div>
  )
}
