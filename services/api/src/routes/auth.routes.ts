import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { z } from 'zod'
import { signAccessToken } from '../auth/jwt.js'
import { StudentProfileModel } from '../models/StudentProfile.js'
import { UserModel } from '../models/User.js'
import { WalletModel } from '../models/Wallet.js'

const authRouter = Router()

const studentRegisterSchema = z.object({
  rollNo: z.string().min(1),
  password: z.string().min(6),
  fullName: z.string().min(1),
  hostel: z.string().min(1),
  department: z.string().min(1),
})

const studentLoginSchema = z.object({
  rollNo: z.string().min(1),
  password: z.string().min(1),
})

const managerLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

authRouter.post('/student/register', async (req, res) => {
  const parsed = studentRegisterSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid student registration payload' })
  }

  const existingStudent = await UserModel.findOne({ role: 'STUDENT', rollNo: parsed.data.rollNo })
  if (existingStudent) {
    return res.status(409).json({ message: 'Student account already exists' })
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10)
  const user = await UserModel.create({
    role: 'STUDENT',
    rollNo: parsed.data.rollNo,
    passwordHash,
  })

  try {
    await StudentProfileModel.create({
      userId: user._id,
      rollNo: parsed.data.rollNo,
      fullName: parsed.data.fullName,
      hostel: parsed.data.hostel,
      department: parsed.data.department,
    })

    await WalletModel.create({
      studentId: user._id,
      openingCredit: 18000,
      availableBalance: 18000,
      blockedBalance: 0,
    })
  } catch (error) {
    await StudentProfileModel.deleteOne({ userId: user._id }).catch(() => undefined)
    await WalletModel.deleteOne({ studentId: user._id }).catch(() => undefined)
    await UserModel.deleteOne({ _id: user._id }).catch(() => undefined)
    throw error
  }

  const accessToken = signAccessToken({
    sub: String(user._id),
    role: 'STUDENT',
  })

  return res.status(201).json({
    accessToken,
    message: 'Student registration successful',
  })
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
