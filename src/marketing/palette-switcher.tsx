import { cn } from '@/lib/utils'
import { CANDIDATAS, paletaDeEstaCarga } from './theme'

/**
 * Conmutador de paleta de la portada. **Solo en desarrollo.**
 *
 * Existe porque el laboratorio enseña las tres candidatas a la vez pero solo sobre el hero
 * y unas superficies de consola, y hay decisiones que ahí no se ven: cómo cae el crema
 * después de la banda oscura, si el durazno cansa habiendo bajado cinco secciones, si la
 * salvia de los titulares aguanta repetida siete veces. Eso solo se juzga en la página
 * entera.
 *
 * Cambia la paleta recargando con `?paleta=…` y no con estado de React, a propósito: así
 * lo que se ve es **exactamente** lo que vería alguien entrando con esa paleta configurada,
 * prerender y primer pintado incluidos, y no una portada que empezó en otra y se repintó.
 */
export function PaletteSwitcher() {
  if (!import.meta.env.DEV) return null

  const activa = paletaDeEstaCarga()

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-1 rounded-full border border-slate-300 bg-white/90 p-1 shadow-sm backdrop-blur">
      <span className="px-2 text-[0.625rem] font-medium uppercase tracking-wider text-slate-500">
        Paleta
      </span>
      {CANDIDATAS.map((c) => (
        <a
          key={c.id}
          href={`?paleta=${c.id}`}
          title={c.note}
          aria-current={c.id === activa ? 'true' : undefined}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-colors',
            c.id === activa
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900',
          )}
        >
          {c.name}
        </a>
      ))}
    </div>
  )
}
