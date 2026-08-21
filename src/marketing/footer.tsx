import { Wordmark } from './brand'

/** El pie: la marca, la promesa en una línea y el año. Nada más — no hay más que enlazar. */
export function Footer() {
  return (
    <footer className="border-t border-border bg-background px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <Wordmark />
        <p className="text-sm text-muted-foreground">La claridad que mueve tu negocio.</p>
        <p className="text-sm text-muted-foreground">© 2026 Nummo</p>
      </div>
    </footer>
  )
}
