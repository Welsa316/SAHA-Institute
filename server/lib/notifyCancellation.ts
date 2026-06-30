import { logger } from './log.js'

export type CancelType = 'student_off' | 'series_cancelled' | 'day_closed'

export interface CancellationEvent {
  type: CancelType
  instanceIds: number[]
  studentIds: number[]
  context?: Record<string, unknown>
}

// NO-OP STUB — intentionally sends nothing today.
//
// TODO(notifications): this is where cancellation notices to families will be
// sent once (a) students have contact info on file and (b) a delivery channel
// is chosen. Both are explicitly out of scope right now — students have no
// email/phone-for-notifications field and there is no reminder system. All three
// cancellation endpoints call this so the wiring exists; do NOT add sending here
// until the contact data + channel are in place.
export function notifyCancellation(event: CancellationEvent): void {
  logger.info('notifyCancellation', 'stub (no-op, nothing sent)', {
    type: event.type,
    instances: event.instanceIds.length,
    students: event.studentIds.length,
  })
}
