import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { z } from 'zod'
import { signAccessToken } from '../auth/jwt.js'
import { UserModel } from '../models/User.js'

const authRouter = Router()

const studentLoginSchema = z.object({
  rollNo: z.string().min(1),
  password: z.string().min(1),
})

const managerLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

authRouter.post('/student/login', async (req, res) => {
  const parsed = studentLoginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid student login payload' })
  }

  const user = await UserModel.findOne({ role: 'STUDENT', rollNo: parsed.data.rollNo })
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
  if (!valid) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  const accessToken = signAccessToken({
    sub: String(user._id),
    role: 'STUDENT',
  })

  return res.json({ accessToken })
})

authRouter.post('/manager/login', async (req, res) => {
  const parsed = managerLoginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid manager login payload' })
  }

  const user = await UserModel.findOne({ role: 'MANAGER', username: parsed.data.username })
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
  if (!valid) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  const accessToken = signAccessToken({
    sub: String(user._id),
    role: 'MANAGER',
  })

  return res.json({ accessToken })
})

authRouter.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out' })
})

export { authRouter }
