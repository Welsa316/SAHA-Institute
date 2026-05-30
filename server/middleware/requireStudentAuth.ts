import type { Request, Response, NextFunction } from 'express'
import { STUDENT_COOKIE_NAME, verifyStudentSession, type StudentJwtPayload } from '../lib/auth.js'

// Guards the student portal endpoints. Reads the saha_student cookie (distinct
// from the admin saha_session) and attaches the verified payload to
// res.locals.student. A student session can't reach admin routes (those use
// requireAuth, which only reads saha_session) and vice versa.

declare module 'express-serve-static-core' {
  interface Locals {
    student?: StudentJwtPayload
  }
}

export function requireStudentAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[STUDENT_COOKIE_NAME]
  if (!token) {
    res.status(401).json({ error: 'Not authenticated.' })
    return
  }
  const payload = verifyStudentSession(token)
  if (!payload) {
    res.status(401).json({ error: 'Session expired or invalid.' })
    return
  }
  res.locals.student = payload
  next()
}
