import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Cuántos se recuerdan. Cinco caben sin empujar el resto fuera de la vista. */
const MAX = 5

export interface RecentItem {
  /** Único y estable: `contact:abc`, `nav:/cartera/cxc`. */
  id: string
  label: string
  /** De qué es: «Contacto», «Cuenta por cobrar»… Se pinta a la derecha. */
  kind: string
  to: string
}

interface RecentsState {
  items: RecentItem[]
  remember: (item: RecentItem) => void
}

/**
 * Lo último que se abrió desde el buscador.
 *
 * Con el campo vacío la paleta enseñaba **veinte destinos**: toda la navegación
 * y todas las acciones, sin un orden que significara nada. Lo que uno busca dos
 * veces suele ser lo mismo que buscó ayer, así que ahí van los recientes.
 *
 * `localStorage` porque es una comodidad del dispositivo, no contexto de una
 * sesión (§21.1); y solo el identificador, la etiqueta y el destino: **ningún
 * importe ni saldo se guarda fuera del servidor** (§88).
 */
export const useRecents = create<RecentsState>()(
  persist(
    (set) => ({
      items: [],
      remember: (item) =>
        set((s) => ({ items: [item, ...s.items.filter((i) => i.id !== item.id)].slice(0, MAX) })),
    }),
    { name: 'nummo-recientes' },
  ),
)
