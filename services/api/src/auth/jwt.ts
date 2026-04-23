import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import type { UserRole } from '../types.js'

interface JwtPayload {
  sub: string
  role: UserRole
}

export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '7d' })
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.jwtSecret) as JwtPayload
}
