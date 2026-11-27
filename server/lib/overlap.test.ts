import { test } from 'node:test'
import assert from 'node:assert/strict'
import { overlaps, firstOverlap } from './overlap.js'

const at = (iso: string) => new Date(iso)
const slot = (iso: string, durationMinutes = 60) => ({ start: at(iso), durationMinutes })

test('same start time overlaps', () => {
  assert.equal(overlaps(slot('2026-11-30T22:00:00Z'), slot('2026-11-30T22:00:00Z')), true)
})

test('partial overlap in either direction', () => {
  // 4:00–5:00 vs 4:30–5:30
  assert.equal(overlaps(slot('2026-11-30T22:00:00Z'), slot('2026-11-30T22:30:00Z')), true)
  assert.equal(overlaps(slot('2026-11-30T22:30:00Z'), slot('2026-11-30T22:00:00Z')), true)
})

test('a short class inside a long one overlaps', () => {
  assert.equal(overlaps(slot('2026-11-30T22:00:00Z', 120), slot('2026-11-30T22:30:00Z', 30)), true)
})

test('back-to-back classes do not overlap', () => {
  // 4:00–5:00 then 5:00–6:00
  assert.equal(overlaps(slot('2026-11-30T22:00:00Z'), slot('2026-11-30T23:00:00Z')), false)
  assert.equal(overlaps(slot('2026-11-30T23:00:00Z'), slot('2026-11-30T22:00:00Z')), false)
})

test('firstOverlap returns the earliest clashing candidate and what it hits', () => {
  const existing = [
    { ...slot('2026-12-07T22:00:00Z'), studentName: 'B' },
    { ...slot('2026-12-02T22:00:00Z'), studentName: 'A' },
  ]
  const candidates = [slot('2026-12-07T22:30:00Z'), slot('2026-11-30T22:00:00Z'), slot('2026-12-02T21:30:00Z')]
  const hit = firstOverlap(candidates, existing)
  assert.ok(hit)
  assert.equal(hit.candidate.start.toISOString(), '2026-12-02T21:30:00.000Z')
  assert.equal(hit.existing.studentName, 'A')
})

test('firstOverlap is null when every candidate is free', () => {
  const existing = [slot('2026-11-30T22:00:00Z')]
  assert.equal(firstOverlap([slot('2026-11-30T23:00:00Z'), slot('2026-11-30T21:00:00Z')], existing), null)
})
