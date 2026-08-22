import { BrandLockup } from '@/components/brand-mark'

/**
 * El pie: la marca, la promesa en una línea y de quién es esto. Nada más — no hay más que
 * enlazar.
 *
 * **Quién publica Nummo va aquí y no en otra parte.** Es lo primero que busca quien quiere
 * saber a quién le está dando sus datos financieros, y en una portada sin «Sobre nosotros»
 * ni política de privacidad, el pie es el único sitio donde puede mirar. Va junto al ©
 * porque son la misma pregunta contestada dos veces: quién responde por esto.
 *
 * El año se calcula. Estaba escrito a mano, que acierta hasta el 1 de enero y a partir de
 * ahí miente en la única línea de la página que nadie vuelve a leer. Aquí es seguro porque
 * la portada monta con `createRoot` y no con `hydrateRoot`: el HTML del prerender se
 * descarta al montar, así que no hay desajuste que reconciliar aunque el build sea de
 * diciembre y la visita de enero.
 */
export function Footer() {
  return (
    <footer className="border-t border-border bg-background px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <BrandLockup textClassName="text-lg" markClassName="size-8" />
        <p className="text-sm text-muted-foreground">La claridad que mueve tu negocio.</p>
        <p className="text-sm text-muted-foreground">
          Un producto de SiriusTech S.A.S. · © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  )
}
