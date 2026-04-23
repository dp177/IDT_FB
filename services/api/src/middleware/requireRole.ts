import type { NextFunction, Request, Response } from 'express'
import type { UserRole } from '../types.js'

export function requireRole(expectedRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== expectedRole) {
      return res.status(403).json({
        message: `Forbidden. ${expectedRole} role required.`,
      })
    }

    return next()
  }
}
