import { Loader2 } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'

/**
 * Pantalla de carga a página completa. Instalada como PWA es lo primero que se
 * ve al abrir la app, así que lleva la marca y no solo un spinner.
 */
export function AppLoader({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <BrandMark className="size-12" />
        <Loader2 className="size-5 animate-spin" />
        <span className="text-sm">{label}</span>
      </div>
    </div>
  )
}
