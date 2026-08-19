import { Note } from '@/components/ui/note'
import { orgStatus } from '@/features/organizations/labels'
import { useOrgReadOnly } from './permissions'

/**
 * **El aviso de que la organización está en solo lectura**, en la cabecera de
 * todas las pantallas.
 *
 * No es un toast, y esa es la decisión: una organización suspendida no es un
 * intento que falló, es un modo de la aplicación entera. Un aviso por cada clic
 * contaría veinte veces lo mismo y solo aparecería **después** de intentarlo;
 * esto lo dice una vez, antes, y explica por qué los botones están apagados
 * (`useCan` los apaga solo).
 *
 * Y dice lo que **sí** se puede hacer, porque es casi todo: consultar y exportar
 * la historia no se gatea nunca, ni siquiera aquí.
 */
export function ReadOnlyBanner() {
  const { isReadOnly, status } = useOrgReadOnly()
  if (!isReadOnly || !status) return null

  return (
    <div className="mb-6">
      <Note tone="warning" title={`Organización ${orgStatus(status).label.toLowerCase()}`}>
        Puedes consultar y exportar toda tu información, pero registrar y modificar está
        deshabilitado. Solo la plataforma puede reactivarla.
      </Note>
    </div>
  )
}
