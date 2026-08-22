/**
 * El fondo de las pantallas de acceso.
 *
 * Decoración, no vitrina: dice «finanzas» con trazos —una curva que sube, unas barras, un
 * par de monedas— y no con una captura del producto. La diferencia importa, porque poner
 * ahí lo que enseña la portada convertía el login en una portada pequeña.
 *
 * Todo va **muy por debajo** en opacidad y con los colores del isotipo (`--logo-*`), que no
 * se re-tematizan (§3.2): así funciona igual en claro y en oscuro sin declarar dos
 * versiones. Y `aria-hidden`: no hay nada que leer aquí.
 */
export function AuthDecor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Dos manchas de marca, desenfocadas: dan profundidad sin dibujar nada. */}
      <div
        className="absolute -left-24 top-16 size-72 rounded-full blur-3xl"
        style={{ background: 'var(--logo-cyan)', opacity: 0.07 }}
      />
      <div
        className="absolute -right-20 bottom-10 size-80 rounded-full blur-3xl"
        style={{ background: 'var(--logo-indigo)', opacity: 0.07 }}
      />

      {/* La curva que sube, arriba a la derecha. */}
      <svg
        className="absolute right-[6%] top-[12%] hidden h-28 w-48 sm:block"
        viewBox="0 0 160 96"
        fill="none"
        style={{ color: 'var(--logo-blue)', opacity: 0.14 }}
      >
        <path
          d="M0 80L40 60l30 12 40-40 50 20"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="40" cy="60" r="3" fill="currentColor" />
        <circle cx="110" cy="32" r="3" fill="currentColor" />
      </svg>

      {/* Las barras, abajo a la izquierda. */}
      <div
        className="absolute bottom-[14%] left-[7%] hidden items-end gap-1.5 sm:flex"
        style={{ opacity: 0.14 }}
      >
        {[14, 24, 18, 32, 26].map((alto, i) => (
          <span
            key={i}
            className="w-1.5 rounded-full"
            style={{ height: alto, background: 'var(--logo-blue)' }}
          />
        ))}
      </div>

      {/* Un par de monedas, del mismo lenguaje que las ilustraciones de los planes. */}
      <svg
        className="absolute bottom-[22%] right-[12%] hidden size-14 lg:block"
        viewBox="0 0 48 48"
        fill="none"
        style={{ color: 'var(--logo-teal)', opacity: 0.16 }}
      >
        <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="2" />
        <path d="M24 16v16M20 20h8M20 28h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>

      <svg
        className="absolute left-[14%] top-[18%] hidden size-10 lg:block"
        viewBox="0 0 40 40"
        fill="none"
        style={{ color: 'var(--logo-indigo)', opacity: 0.14 }}
      >
        <rect x="8" y="6" width="24" height="28" rx="4" stroke="currentColor" strokeWidth="2" />
        <path d="M14 14h12M14 21h12M14 27h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  )
}
