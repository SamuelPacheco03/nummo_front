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

export function RichText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {parseBlocks(text).map((block, i) =>
        block.type === 'ul' ? (
          <ul key={i} className="list-disc space-y-0.5 pl-4">
            {block.items.map((item, j) => (
              <li key={j}>
                <Inline text={item} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={i} className="whitespace-pre-wrap">
            <Inline text={block.text} />
          </p>
        ),
      )}
    </div>
  )
}
