import type { Request, Response, NextFunction } from 'express'
import { SESSION_COOKIE_NAME, verifySession, type JwtPayload } from '../lib/auth.js'

// Attach the verified session payload to res.locals so downstream handlers can read it
// without re-parsing the cookie.

declare module 'express-serve-static-core' {
  interface Locals {
    user?: JwtPayload
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[SESSION_COOKIE_NAME]
  if (!token) {
    res.status(401).json({ error: 'Not authenticated.' })
    return
  }
  const payload = verifySession(token)
  if (!payload) {
    res.status(401).json({ error: 'Session expired or invalid.' })
    return
  }
  res.locals.user = payload
  next()
}

// Admin-only gate. Chain AFTER requireAuth (reads the payload it sets). Teachers
// and unauthenticated requests are rejected. Use for create/manage endpoints and
// the admin-wide cancellations.
export function requireAdmin(_req: Request, res: Response, next: NextFunction): void {
  const user = res.locals.user
  if (!user) {
    res.status(401).json({ error: 'Not authenticated.' })
    return
  }
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required.' })
    return
  }
  next()
}
