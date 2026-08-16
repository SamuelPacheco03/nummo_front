import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Identidad visual de Numi: la superficie de marca con la chispa del asistente. */
export function NumiAvatar({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'bg-brand-gradient grid size-7 shrink-0 place-items-center rounded-full text-white',
        className,
      )}
      aria-hidden
    >
      <Sparkles className="size-[55%]" />
    </span>
  )
}
