/**
 * El catálogo de figuras candidatas para el panel del acceso.
 *
 * Vive aparte de `auth-art.tsx` porque un archivo que exporta componentes **y** constantes
 * rompe el refresco rápido de Vite: al tocar el dibujo, la constante se reevalúa y el
 * módulo entero se recarga.
 */
export type FiguraId = 'orden' | 'ciclo' | 'isotipo'

export const FIGURAS: readonly { id: FiguraId; nombre: string; nota: string }[] = [
  { id: 'orden', nombre: 'Orden', nota: 'Lo disperso que se alinea. Dice lo mismo que el titular.' },
  { id: 'ciclo', nombre: 'Ciclo', nota: 'Se crea el cobro, se recuerda, entra el pago.' },
  { id: 'isotipo', nombre: 'Isotipo', nota: 'La marca sin metáfora, como Linear o Stripe.' },
]
