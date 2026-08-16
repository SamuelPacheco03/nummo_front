/**
 * "Numi está escribiendo…" mientras el endpoint responde. El endpoint no hace
 * streaming (una sola respuesta), así que estos puntos son la única señal de
 * que algo está pasando: sin ellos la espera parece un cuelgue.
 */
export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1" role="status">
      <span className="sr-only">Numi está escribiendo…</span>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 motion-reduce:animate-pulse"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}
