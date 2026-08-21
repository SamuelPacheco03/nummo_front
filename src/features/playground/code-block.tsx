import { useState, type ReactNode } from 'react'
import { ChevronRight, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

/**
 * **Texto que se lee tal cual**: el prompt que recibió el modelo, los argumentos de una
 * herramienta, lo que devolvió.
 *
 * Aquí no se resume ni se formatea bonito: el valor de esta consola es enseñar lo
 * literal. Scrollea por dentro con la barra fina de la app (§11.1.2) y no desborda la
 * página, que es lo único que hay que cuidar cuando el contenido es de tamaño imprevisible.
 */
export function CodeBlock({ children, className }: { children: string; className?: string }) {
  return (
    <pre
      className={cn(
        'bg-secondary/60 scrollbar-slim max-h-64 overflow-auto rounded-lg border p-3 text-xs leading-relaxed whitespace-pre-wrap',
        className,
      )}
    >
      {children}
    </pre>
  )
}

/** Lo que devolvió una herramienta, que casi siempre es JSON y a veces no. */
export function JsonBlock({ value }: { value: unknown }) {
  if (value === undefined || value === null) {
    return <p className="text-muted-foreground text-xs">Sin contenido.</p>
  }
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  return <CodeBlock>{text}</CodeBlock>
}

/**
 * Un bloque que se abre.
 *
 * Sobre `<details>` nativo: trae el teclado, el foco y el estado abierto/cerrado sin
 * JavaScript, y aquí se abren y se cierran muchos —una traza son ocho— así que cualquier
 * cosa con estado propio sería memoria que no hace falta.
 */
export function Disclosure({
  summary,
  meta,
  defaultOpen = false,
  children,
}: {
  summary: ReactNode
  /** A la derecha del título: duración, número de tokens, lo que resuma sin abrir. */
  meta?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <details open={defaultOpen} className="group rounded-lg border">
      <summary
        className={cn(
          'hover:bg-accent flex cursor-pointer list-none items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm transition-colors',
          'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
          'pointer-coarse:min-h-11',
        )}
      >
        <ChevronRight
          aria-hidden
          className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-90"
        />
        <span className="min-w-0 flex-1">{summary}</span>
        {meta && <span className="nums text-muted-foreground shrink-0 text-xs">{meta}</span>}
      </summary>
      <div className="space-y-2 border-t px-3.5 py-3">{children}</div>
    </details>
  )
}

/** Copiar el prompt entero, que es lo que se pega en el editor para probar otro. */
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard
          .writeText(text)
          .then(() => {
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1500)
          })
          .catch(() => toast.error('No se pudo copiar.'))
      }}
      className={cn(
        'text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors',
        'focus-visible:ring-ring/50 rounded focus-visible:ring-[3px] focus-visible:outline-none',
      )}
    >
      <Copy aria-hidden className="size-3.5" />
      {copied ? 'Copiado' : label}
    </button>
  )
}
