import { describe, expect, it } from 'vitest'
import type { MessageList } from '@/api/generated/model'
import { flattenMessagePages } from './use-numi-history'

const msg = (id: string): MessageList['items'][number] => ({
  id,
  role: 'user',
  content: id,
  source: 'text',
  createdAt: '2026-08-16T00:00:00.000Z',
})

describe('flattenMessagePages', () => {
  it('turns newest-first pages into an oldest→newest transcript', () => {
    // page 0 = newest page; page 1 = the older page fetched on scroll up.
    const pages: MessageList[] = [
      { items: [msg('m5'), msg('m4'), msg('m3')], nextCursor: 'cursor' },
      { items: [msg('m2'), msg('m1')], nextCursor: null },
    ]
    const out = flattenMessagePages(pages)
    expect(out.map((m) => m.id)).toEqual(['m1', 'm2', 'm3', 'm4', 'm5'])
    expect(out[0]?.at).toBe('2026-08-16T00:00:00.000Z') // createdAt mapped to `at`
  })

  it('returns [] for no pages', () => {
    expect(flattenMessagePages([])).toEqual([])
  })
})
