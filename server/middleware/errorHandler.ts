import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { logger } from '../lib/log.js'

// Centralized error handler so route handlers can just `throw` and we always return
// a clean JSON response with the right status code.

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed.',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    })
    return
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message })
    return
  }

  const message = err instanceof Error ? err.message : 'Unknown error'
  logger.error('http', 'unhandled error', { method: req.method, url: req.url, message })
  res.status(500).json({ error: 'Something went wrong. Please try again.' })
}

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}
