import { describe, expect, it } from 'vitest'
import type { MessageList } from '@/api/generated/model'
import { flattenMessagePages } from './use-numi-history'

const msg = (id: string): MessageList['items'][number] => ({
  id,
  role: 'user',
  content: id,
  source: 'text',
  hasAudio: false,
  waveform: null,
  audioSeconds: null,
  feedback: null,
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

  it('carries what the archive knows about a dictated message', () => {
    const dictated = { ...msg('m1'), source: 'audio' as const, hasAudio: true, content: 'cuánto debe Ana' }
    // Dictated but the audio is gone (no object storage): only the transcript survives.
    const orphan = { ...msg('m2'), source: 'audio' as const, hasAudio: false }
    const out = flattenMessagePages([{ items: [orphan, dictated], nextCursor: null }])

    expect(out[0]).toMatchObject({ id: 'm1', dictated: true, hasAudio: true })
    expect(out[1]).toMatchObject({ id: 'm2', dictated: true, hasAudio: false })
    expect(out.every((m) => m.audioUrl === undefined)).toBe(true) // el blob local no viene del servidor
  })
})
