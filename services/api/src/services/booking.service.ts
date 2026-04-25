import { Types } from 'mongoose'
import { DAILY_BASE_FEE, ITEM_PRICES, CARB_PRICES, type MealType, type PortionType } from '../constants.js'
import { MealOrderModel } from '../models/MealOrder.js'
import { MessCapacityModel } from '../models/MessCapacity.js'
import { MessModel } from '../models/Mess.js'
import { StudentProfileModel } from '../models/StudentProfile.js'
import { UserModel } from '../models/User.js'
import { WalletModel } from '../models/Wallet.js'
import { WalletTransactionModel } from '../models/WalletTransaction.js'
import { generateTokenNo } from '../utils/token.js'

interface CreateOrderInput {
  studentId: string
  mealDate: string
  mealType: MealType
  messId: string
  portion: PortionType
  selections?: Record<string, any>
  isDefault?: boolean
}

async function debitWallet(studentId: string, amount: number, note: string, mealOrderId?: string) {
  const wallet = await WalletModel.findOne({ studentId })
  if (!wallet) {
    throw new Error('Wallet not found for student')
  }

  if (wallet.availableBalance < amount) {
    throw new Error('Insufficient wallet balance')
  }

  wallet.availableBalance -= amount
  await wallet.save()

  await WalletTransactionModel.create({
    studentId,
    type: 'DEBIT',
    amount,
    mealOrderId,
    note,
  })
}

async function creditWallet(studentId: string, amount: number, note: string, mealOrderId?: string) {
  const wallet = await WalletModel.findOne({ studentId })
  if (!wallet) {
    throw new Error('Wallet not found for student')
  }

  wallet.availableBalance += amount
  await wallet.save()

  await WalletTransactionModel.create({
    studentId,
    type: 'REFUND',
    amount,
    mealOrderId,
    note,
  })
}

async function ensureBaseFeePaid(studentId: string, date: string) {
  const wallet = await WalletModel.findOne({ studentId })
  if (!wallet) throw new Error('Wallet not found')

  if (wallet.lastBaseFeeDeductedAt !== date) {
    await debitWallet(studentId, DAILY_BASE_FEE, `Daily operational fee ${date}`)
    wallet.lastBaseFeeDeductedAt = date
    await wallet.save()
    return DAILY_BASE_FEE
  }
  return 0
}

export async function ensureStudentCanOrder(studentId: string) {
  const profile = await StudentProfileModel.findOne({ userId: studentId })
  if (!profile) {
    throw new Error('Student profile not found')
  }

  if (!profile.dietaryPreference) {
    throw new Error('Set Jain or Not Jain preference before booking')
  }
}

export async function getOrCreateCapacity(messId: string, mealDate: string, mealType: MealType) {
  const existing = await MessCapacityModel.findOne({ messId, mealDate, mealType })
  if (existing) {
    return existing
  }

  return MessCapacityModel.create({
    messId,
    mealDate,
    mealType,
    capacity: 800,
    bookedCount: 0,
  })
}

export async function createMealOrder(input: CreateOrderInput) {
  const existingOrder = await MealOrderModel.findOne({
    studentId: input.studentId,
    mealDate: input.mealDate,
    mealType: input.mealType,
  })

  if (existingOrder) {
    throw new Error('Meal already booked/skipped for this slot')
  }

  const mess = await MessModel.findById(input.messId)
  if (!mess || mess.status !== 'ACTIVE') {
    throw new Error('Selected mess is not available')
  }

  const capacity = await getOrCreateCapacity(input.messId, input.mealDate, input.mealType)
  if (capacity.bookedCount >= capacity.capacity) {
    throw new Error('Selected mess is full for this meal slot')
  }

  // Ensure base fee is paid for the target date
  const baseFeePaidNow = await ensureBaseFeePaid(input.studentId, input.mealDate)

  // Calculate total price from selections
  let mealCost = 0
  const selections = input.selections || {}
  
  for (const key in selections) {
    const sel = selections[key]
    if (key === 'rotiCount' || key === 'rice') {
      const price = CARB_PRICES[sel.id] || 0
      mealCost += sel.portion === 'HALF' ? Math.round(price * 0.7) : price
    } else {
      const price = ITEM_PRICES[sel.id] || 0
      mealCost += sel.portion === 'HALF' ? Math.round(price * 0.7) : price
    }
  }

  const totalPrice = mealCost

  const order = await MealOrderModel.create({
    studentId: input.studentId,
    mealDate: input.mealDate,
    mealType: input.mealType,
    messId: input.messId,
    portion: input.portion,
    selections: input.selections ?? {},
    tokenNo: generateTokenNo(),
    status: input.isDefault ? 'DEFAULTED' : 'BOOKED',
    isDefault: Boolean(input.isDefault),
    price: totalPrice,
    baseFeePaid: baseFeePaidNow, // Note: this tracks if it was paid DURING this booking
    mealCostPaid: mealCost,
  })

  capacity.bookedCount += 1
  await capacity.save()

  await debitWallet(input.studentId, mealCost, `Meal charge ${input.mealDate} ${input.mealType}`, String(order._id))

  return order
}

export async function skipMealOrder(studentId: string, mealDate: string, mealType: MealType, reason: string) {
  const order = await MealOrderModel.findOne({ studentId, mealDate, mealType })

  if (!order) {
    throw new Error('No meal booking found for skip')
  }

  if (order.status === 'SERVED') {
    throw new Error('Served meal cannot be skipped')
  }

  if (order.status === 'SKIPPED') {
    throw new Error('Meal already skipped')
  }

  order.status = 'SKIPPED'
  order.skipReason = reason
  await order.save()

  await MessCapacityModel.updateOne(
    { messId: order.messId, mealDate: order.mealDate, mealType: order.mealType, bookedCount: { $gt: 0 } },
    { $inc: { bookedCount: -1 } },
  )

  const refundAmount = (order as any).mealCostPaid || order.price
  await creditWallet(studentId, refundAmount, `Refund for skipped meal ${mealDate} ${mealType}`, String(order._id))

  return order
}

export async function runDefaultAssignment(mealDate: string, mealType: MealType) {
  const students = await UserModel.find({ role: 'STUDENT', status: 'ACTIVE' })
  const orders = await MealOrderModel.find({ mealDate, mealType })
  const orderedStudentIds = new Set(orders.map((item) => String(item.studentId)))
  const activeMesses = await MessModel.find({ status: 'ACTIVE' })

  let created = 0

  for (const student of students) {
    if (orderedStudentIds.has(String(student._id))) {
      continue
    }

    const profile = await StudentProfileModel.findOne({ userId: student._id })
    if (!profile?.dietaryPreference) {
      continue
    }

    let assignedMessId: string | null = null

    for (const mess of activeMesses) {
      const cap = await getOrCreateCapacity(String(mess._id), mealDate, mealType)
      if (cap.bookedCount < cap.capacity) {
        assignedMessId = String(mess._id)
        break
      }
    }

    if (!assignedMessId) {
      continue
    }

    try {
      // Map global default preferences to specific meal selections
      const rawDefs = profile.defaultSelections
      const defs = rawDefs instanceof Map ? Object.fromEntries(rawDefs) : (rawDefs || {})
      let selections: any = { mode: 'AUTO_DEFAULT' }
      
      if (mealType === 'BREAKFAST') {
        if (defs.main) selections.main = defs.main
        if (defs.beverage) selections.beverage = defs.beverage
        if (defs.health) selections.health = defs.health
        if (defs.bakery) selections.bakery = defs.bakery
      } else if (mealType === 'LUNCH' || mealType === 'DINNER') {
        if (defs.base) selections.base = defs.base
        if (defs.topup) selections.topup = defs.topup
        if (defs.dry) selections.dry = defs.dry
        if (defs.dal) selections.dal = defs.dal
        if (defs.rotiCount) selections.rotiCount = defs.rotiCount
        if (defs.rice) selections.rice = defs.rice
      }

      await createMealOrder({
        studentId: String(student._id),
        mealDate,
        mealType,
        messId: assignedMessId,
        portion: 'FULL',
        selections: selections,
        isDefault: true,
      })
      created += 1
    } catch {
      continue
    }
  }

  return { created }
}

export async function resolveStudentByRfid(rfidTag: string) {
  const profile = await StudentProfileModel.findOne({ rfidTag })
  if (!profile) {
    return null
  }

  return String(profile.userId)
}

export function toObjectId(value: string) {
  return new Types.ObjectId(value)
}
