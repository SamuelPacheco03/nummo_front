import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { parseBlocks, parseInline } from './rich-text-parser'

/**
 * Pinta la respuesta de Numi. Nada de HTML crudo: el texto viene de un LLM y de
 * los datos de la organización, así que se renderiza como nodos de React y
 * jamás con `dangerouslySetInnerHTML`.
 */

function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((token, i) => {
        if (token.type === 'bold') {
          return (
            <strong key={i} className="font-semibold">
              {token.value}
            </strong>
          )
        }
        if (token.type === 'code') {
          return (
            <code key={i} className="rounded bg-background/70 px-1 py-0.5 text-[0.85em]">
              {token.value}
            </code>
          )
        }
        return <span key={i}>{token.value}</span>
      })}
    </>
  )
}

/**
 * `trailing` se inyecta dentro del ÚLTIMO bloque, no después del texto: así la
 * hora de la burbuja reserva su hueco en la misma línea en la que termina el
 * mensaje, como en cualquier app de mensajería.
 */
export function RichText({
  text,
  className,
  trailing,
}: {
  text: string
  className?: string
  trailing?: ReactNode
}) {
  const blocks = parseBlocks(text)
  const last = blocks.length - 1

  return (
    <div className={cn('space-y-2', className)}>
      {blocks.map((block, i) =>
        block.type === 'ul' ? (
          <ul key={i} className="list-disc space-y-0.5 pl-4">
            {block.items.map((item, j) => (
              <li key={j}>
                <Inline text={item} />
                {i === last && j === block.items.length - 1 ? trailing : null}
              </li>
            ))}
          </ul>
        ) : (
          <p key={i} className="whitespace-pre-wrap">
            <Inline text={block.text} />
            {i === last ? trailing : null}
          </p>
        ),
      )}
      {blocks.length === 0 ? trailing : null}
    </div>
  )
}
