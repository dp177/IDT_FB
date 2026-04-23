import type { NextFunction, Request, Response } from 'express'
import { verifyAccessToken } from '../auth/jwt.js'

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header('authorization')
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid authorization header' })
  }

  const token = authHeader.slice(7).trim()

  try {
    const payload = verifyAccessToken(token)
    req.user = {
      id: payload.sub,
      role: payload.role,
    }
    return next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}
