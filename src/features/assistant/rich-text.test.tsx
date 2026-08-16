import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RichText } from './rich-text'
import { parseBlocks, parseInline } from './rich-text-parser'

test('agrupa viñetas consecutivas en una lista', () => {
  const blocks = parseBlocks('Tus deudores:\n- Ana: $50.000\n- Luis: $20.000\n\nTotal: $70.000')
  expect(blocks).toEqual([
    { type: 'p', text: 'Tus deudores:' },
    { type: 'ul', items: ['Ana: $50.000', 'Luis: $20.000'] },
    { type: 'p', text: 'Total: $70.000' },
  ])
})

test('separa negrita y código del texto plano', () => {
  expect(parseInline('Saldo **$1.000** en `Caja`')).toEqual([
    { type: 'text', value: 'Saldo ' },
    { type: 'bold', value: '$1.000' },
    { type: 'text', value: ' en ' },
    { type: 'code', value: 'Caja' },
  ])
})

test('pinta el markdown como nodos, no como HTML', () => {
  render(<RichText text={'Hola **Ana**\n- uno\n- dos'} />)
  expect(screen.getByText('Ana').tagName).toBe('STRONG')
  expect(screen.getAllByRole('listitem')).toHaveLength(2)
})
