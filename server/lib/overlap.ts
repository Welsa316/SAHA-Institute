// Pure time-overlap logic, kept free of database imports so it can be unit
// tested on its own. A class occupies [start, start + duration). Back-to-back
// classes (one ends at 4:00, the next starts at 4:00) do NOT overlap.

export type Slot = { start: Date; durationMinutes: number }

export function slotEnd(s: Slot): number {
  return s.start.getTime() + s.durationMinutes * 60_000
}

export function overlaps(a: Slot, b: Slot): boolean {
  return a.start.getTime() < slotEnd(b) && b.start.getTime() < slotEnd(a)
}

// The first (earliest) candidate slot that collides with any existing slot,
// paired with the existing slot it hits; null when everything is free.
export function firstOverlap<E extends Slot>(
  candidates: Slot[],
  existing: E[],
): { candidate: Slot; existing: E } | null {
  const sorted = [...candidates].sort((a, b) => a.start.getTime() - b.start.getTime())
  for (const candidate of sorted) {
    const hit = existing.find((e) => overlaps(candidate, e))
    if (hit) return { candidate, existing: hit }
  }
  return null
}
