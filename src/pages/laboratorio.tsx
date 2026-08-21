import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatMoney } from '@/lib/format'
import { AA_LARGE, AA_TEXT, contrast } from '@/lib/palette/contrast'
import { PALETTES, type Palette, type PaletteMode } from '@/lib/palette/palettes'
import { paletteStyle } from '@/lib/palette/tokens'
import { cn } from '@/lib/utils'
import { Hero } from '@/marketing/hero'
import { DISPLAY_FACES, faceById, type DisplayFaceId } from '@/marketing/type'

/*
  Las tres familias que se comparan. Se importan AQUÍ y no en `index.css` a propósito:
  esta ruta se carga con `lazy()`, así que los ~200 kB de fuentes viven en el trozo del
  laboratorio y no los descarga nadie que entre a la consola. Cuando se elija una, esa
  —y solo esa— sube a la entrada de la portada.
*/
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource-variable/archivo'
import '@fontsource-variable/bricolage-grotesque'

/**
 * El laboratorio de la portada (§97).
 *
 * Existe porque una paleta no se decide en un mockup: la que enamora en un hero puede
 * ser ilegible en una tabla de cifras, y eso **solo se ve mirándola ahí**. Por eso cada
 * candidata se pinta sobre el hero real y sobre superficies de consola de verdad —KPIs,
 * tabla, burbuja de Numi, botones, campos—, en claro y en oscuro **a la vez**.
 *
 * Es una herramienta de desarrollo: la ruta solo se registra bajo `import.meta.env.DEV`
 * y no entra al bundle de producción.
 */

/**
 * La familia y el eje de ancho de la candidata, aplicados SOLO a los titulares.
 *
 * Va como CSS propio y no como utilidades de Tailwind por dos razones:
 *
 * 1. **No vale con redefinir `--font-display`.** `index.css` declara las fuentes en un
 *    bloque `@theme inline`, y lo que hace `inline` es meter el valor DENTRO de la
 *    utilidad en vez de emitir un `var(--font-display)`: `font-display` compila a la
 *    familia literal y pisar la variable no cambia nada. Comprobado en el navegador, no
 *    deducido.
 * 2. **Tailwind escanea el código fuente, no el bundle.** Escrito como variante arbitraria
 *    (`[&_h1]:[font-family:…]`), las reglas acababan en el CSS de producción aunque el
 *    JavaScript de esta ruta se elimine por `import.meta.env.DEV` — comprobado en `dist/`.
 *    Aquí viajan con el componente, que sí desaparece entero.
 *
 * Y se aplica a los titulares y no al envoltorio porque el eje de ancho alcanzaría también
 * al cuerpo: hoy sería inocuo —Inter no tiene eje de ancho— pero el día que el cuerpo
 * cambie de familia la muestra estaría apretando algo que nadie pidió apretar.
 */
const ESTILO_TITULARES = `
  .lab-titulares :is(h1, h2, h3) {
    font-family: var(--display-stack);
    font-stretch: var(--display-stretch);
  }
`

/** Un par a vigilar en la lectura de contraste, en el idioma de la pantalla. */
const LECTURAS: readonly { que: string; frente: string; sobre: string; minimo: number }[] = [
  { que: 'Texto sobre el fondo', frente: '--foreground', sobre: '--background', minimo: AA_TEXT },
  { que: 'Texto secundario', frente: '--muted-foreground', sobre: '--background', minimo: AA_TEXT },
  { que: 'Enlace', frente: '--brand', sobre: '--background', minimo: AA_TEXT },
  { que: 'Botón primario', frente: '--primary-foreground', sobre: '--primary', minimo: AA_TEXT },
  { que: 'Cifra en positivo', frente: '--success-strong', sobre: '--card', minimo: AA_TEXT },
  { que: 'Texto de error', frente: '--destructive-strong', sobre: '--card', minimo: AA_TEXT },
  { que: 'Burbuja de Numi', frente: '--chat-bubble-foreground', sobre: '--chat-bubble', minimo: AA_TEXT },
  { que: 'Anillo de foco', frente: '--ring', sobre: '--background', minimo: AA_LARGE },
  { que: 'Borde (informativo)', frente: '--border', sobre: '--background', minimo: 0 },
]

/** Las cifras y filas de la muestra de consola. Las mismas en las tres candidatas. */
const FILAS = [
  { nombre: 'Jardín Infantil Semillas', dias: '12 días', monto: '1450000.00', estado: 'vencido' },
  { nombre: 'Panadería La Espiga', dias: 'Vence el viernes', monto: '860000.00', estado: 'por-vencer' },
  { nombre: 'Taller Rueda Libre', dias: 'Al día', monto: '2310000.00', estado: 'al-dia' },
] as const

function MuestraConsola() {
  return (
    <div className="bg-background px-6 py-10">
      <p className="text-xs font-medium text-muted-foreground">La misma paleta, en la consola</p>
      <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">Cartera</h2>

      <Card className="mt-5 p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Saldo por cobrar</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground tabular-nums">
              {formatMoney('4620000.00')}
            </p>
          </div>
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Vencido</p>
              <p className="mt-0.5 font-medium text-destructive-strong tabular-nums">
                {formatMoney('1450000.00')}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cobrado</p>
              <p className="mt-0.5 font-medium text-success-strong tabular-nums">
                {formatMoney('3180000.00')}
              </p>
            </div>
          </div>
        </div>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="pb-2 font-medium">Contacto</th>
              <th className="pb-2 font-medium">Estado</th>
              <th className="pb-2 text-right font-medium">Monto</th>
            </tr>
          </thead>
          <tbody>
            {FILAS.map((f) => (
              <tr key={f.nombre} className="border-b border-border last:border-0">
                <td className="py-2.5 text-foreground">{f.nombre}</td>
                <td className="py-2.5">
                  {f.estado === 'vencido' ? (
                    <Badge variant="destructive">{f.dias}</Badge>
                  ) : f.estado === 'por-vencer' ? (
                    <Badge variant="warning">{f.dias}</Badge>
                  ) : (
                    <Badge variant="success">{f.dias}</Badge>
                  )}
                </td>
                <td className="py-2.5 text-right tabular-nums text-foreground">
                  {formatMoney(f.monto)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button>Registrar pago</Button>
        <Button variant="outline">Exportar</Button>
        <Button variant="destructive">Eliminar</Button>
        <Input className="max-w-52" placeholder="Buscar contacto" />
      </div>

      {/* La burbuja de Numi, que es superficie de lectura y no un botón. */}
      <div className="mt-5 flex max-w-md items-start gap-2.5 rounded-xl bg-chat-bubble px-4 py-3">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
        <p className="text-sm leading-snug text-chat-bubble-foreground">
          Este mes cobraste un 18 % más que el pasado. Lo vencido bajó de siete clientes a tres.
        </p>
      </div>
    </div>
  )
}

/** Lectura de contraste de la paleta activa en un modo. Números, no impresiones. */
function Lecturas({ palette, mode }: { palette: Palette; mode: PaletteMode }) {
  const tokens = paletteStyle(palette, mode) as unknown as Record<string, string>
  return (
    <dl className="grid gap-x-6 gap-y-1.5 px-6 pb-8 text-xs sm:grid-cols-2">
      {LECTURAS.map((l) => {
        const razon = contrast(tokens[l.frente], tokens[l.sobre])
        const pasa = razon >= l.minimo
        return (
          <div key={l.que} className="flex items-baseline justify-between gap-3 border-b border-border py-1">
            <dt className="text-muted-foreground">{l.que}</dt>
            <dd className="flex items-center gap-2 tabular-nums">
              <span className="text-foreground">{razon.toFixed(2)}:1</span>
              {l.minimo > 0 && (
                <span className={cn('font-medium', pasa ? 'text-success-strong' : 'text-destructive-strong')}>
                  {pasa ? 'AA' : `< ${l.minimo}`}
                </span>
              )}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

/**
 * Un panel: una candidata en un modo, con todo dentro.
 *
 * Los tokens van como custom properties EN LÍNEA, y el panel oscuro lleva además la
 * clase `.dark` para que las pocas utilidades `dark:` que usan las primitivas se activen
 * donde toca. Los estilos en línea ganan a `.dark` de `index.css`, así que lo que se ve
 * es la candidata y no una mezcla — siempre que `derive` emita todos los tokens, que es
 * justo lo que vigila `tokens.test.ts`.
 */
function Panel({
  palette,
  mode,
  face,
}: {
  palette: Palette
  mode: PaletteMode
  face: DisplayFaceId
}) {
  const { stack, stretch } = faceById(face)
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
        <span className="text-xs font-medium text-slate-700">
          {palette.name} · {mode === 'light' ? 'claro' : 'oscuro'}
        </span>
        <span className="font-mono text-[0.6875rem] text-slate-500">{palette[mode].surface}</span>
      </header>
      <div
        className={cn(
          'scrollbar-slim max-h-[80vh] overflow-y-auto',
          // La regla que pinta los titulares con la candidata vive en `ESTILO_TITULARES`.
          'lab-titulares',
          mode === 'dark' && 'dark',
        )}
        style={{
          ...paletteStyle(palette, mode),
          // La grotesca de la candidata manda en los titulares de la muestra.
          ['--display-stack' as string]: stack,
          ['--display-stretch' as string]: stretch ?? '100%',
        }}
      >
        <Hero />
        <MuestraConsola />
        <Lecturas palette={palette} mode={mode} />
      </div>
    </section>
  )
}

export function LaboratorioPage() {
  const [paletteId, setPaletteId] = useState(PALETTES[0].id)
  const [face, setFace] = useState<DisplayFaceId>('archivo')
  const palette = PALETTES.find((p) => p.id === paletteId) ?? PALETTES[0]

  /*
    El laboratorio se queda con el tema mientras está montado.

    Si `<html>` conserva `.dark` porque quien mira tiene la consola en oscuro, el panel
    CLARO queda colgando de un ancestro oscuro y las utilidades `dark:` de las primitivas
    se activan dentro de él. Son pocas —ocho en todo `src/`— pero el trabajo de esta
    pantalla es que lo que se ve sea exactamente la candidata. Se quita al entrar y se
    devuelve al salir; la decisión de tema del usuario no se toca, solo se aparta.
  */
  useEffect(() => {
    const html = document.documentElement
    const teniaDark = html.classList.contains('dark')
    html.classList.remove('dark')
    return () => {
      if (teniaDark) html.classList.add('dark')
    }
  }, [])

  return (
    /*
      El cromo del laboratorio va en gris fijo, no en tokens: si se pintara con la paleta
      activa cambiaría junto a las muestras y dejaría de ser una referencia estable. Es la
      única pantalla del proyecto donde un color literal es lo correcto.
    */
    <div className="min-h-dvh bg-slate-100 text-slate-900">
      <style>{ESTILO_TITULARES}</style>
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-x-8 gap-y-3 px-6 py-3">
          <div>
            <h1 className="text-sm font-semibold">Laboratorio de la portada</h1>
            <p className="text-xs text-slate-500">{palette.note}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Paleta</span>
            {PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPaletteId(p.id)}
                aria-pressed={p.id === paletteId}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  p.id === paletteId
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300',
                )}
              >
                {p.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Titulares</span>
            {DISPLAY_FACES.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFace(f.id)}
                aria-pressed={f.id === face}
                title={f.note}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  f.id === face
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300',
                )}
                style={{ fontFamily: f.stack }}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/*
        Claro y oscuro a la vez, no un interruptor: alternar obliga a comparar de memoria,
        y de memoria no se distingue un fondo tibio de uno frío.
      */}
      <main className="mx-auto grid max-w-[1800px] gap-6 p-6 xl:grid-cols-2">
        <Panel palette={palette} mode="light" face={face} />
        <Panel palette={palette} mode="dark" face={face} />
      </main>
    </div>
  )
}
