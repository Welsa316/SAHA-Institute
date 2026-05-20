// Admin actions and important lifecycle events go through here so we always get a timestamp
// and a stable prefix in Railway's log stream. Never log the request body — we'd risk leaking
// password fields, contact form messages, etc.

type Level = 'info' | 'warn' | 'error'

export function log(level: Level, area: string, event: string, meta?: Record<string, unknown>): void {
  const ts = new Date().toISOString()
  const safeMeta = meta ? ` ${JSON.stringify(meta)}` : ''
  const line = `[${ts}] [${level}] [${area}] ${event}${safeMeta}`
  if (level === 'error') {
    console.error(line)
  } else if (level === 'warn') {
    console.warn(line)
  } else {
    console.log(line)
  }
}

export const logger = {
  info: (area: string, event: string, meta?: Record<string, unknown>) => log('info', area, event, meta),
  warn: (area: string, event: string, meta?: Record<string, unknown>) => log('warn', area, event, meta),
  error: (area: string, event: string, meta?: Record<string, unknown>) => log('error', area, event, meta),
}
