import type { Request } from 'express'

export type UserRole = 'STUDENT' | 'MANAGER'

export interface AuthUser {
  id: string
  role: UserRole
}

export interface AuthRequest extends Request {
  user?: AuthUser
}
