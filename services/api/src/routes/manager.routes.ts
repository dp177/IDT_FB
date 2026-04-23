import { Router } from 'express'
import { z } from 'zod'
import { MEAL_TYPES, type MealType } from '../constants.js'
import { MealOrderModel } from '../models/MealOrder.js'
import { MessCapacityModel } from '../models/MessCapacity.js'
import { WalletTransactionModel } from '../models/WalletTransaction.js'
import { resolveStudentByRfid, runDefaultAssignment } from '../services/booking.service.js'
import { todayIstDate } from '../utils/time.js'

const managerRouter = Router()

const mealQuerySchema = z.object({
  mealDate: z.string(),
  mealType: z.enum(MEAL_TYPES),
})

managerRouter.get('/dashboard/headcount', async (req, res) => {
  const mealDate = String(req.query.mealDate ?? todayIstDate())
  const mealType = String(req.query.mealType ?? 'LUNCH') as MealType

  const rows = await MealOrderModel.aggregate([
    { $match: { mealDate, mealType, status: { $in: ['BOOKED', 'DEFAULTED', 'SERVED'] } } },
    {
      $group: {
        _id: { key: '$selections.topup' },
        count: { $sum: 1 },
      },
    },
  ])

  const totalOrders = await MealOrderModel.countDocuments({
    mealDate,
    mealType,
    status: { $in: ['BOOKED', 'DEFAULTED', 'SERVED'] },
  })

  return res.json({
    mealDate,
    mealType,
    totalOrders,
    byTopup: rows.map((row) => ({ topup: row._id.key ?? 'UNSPECIFIED', count: row.count })),
  })
})

managerRouter.get('/production-plan', async (req, res) => {
  const parsed = mealQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({ message: 'mealDate and mealType are required' })
  }

  const rows = await MealOrderModel.aggregate([
    { $match: { mealDate: parsed.data.mealDate, mealType: parsed.data.mealType, status: { $in: ['BOOKED', 'DEFAULTED'] } } },
    {
      $group: {
        _id: { 
          base: { $ifNull: ['$selections.base.id', '$selections.base'] }, 
          topup: { $ifNull: ['$selections.topup.id', '$selections.topup'] }, 
          dry: { $ifNull: ['$selections.dry.id', '$selections.dry'] },
          roti: { $ifNull: ['$selections.rotiCount.id', '$selections.rotiCount'] },
          rice: { $ifNull: ['$selections.rice.id', '$selections.rice'] },
          ricePortion: { $ifNull: ['$selections.rice.portion', 'FULL'] }
        },
        count: { $sum: 1 },
      },
    },
  ])

  return res.json({
    mealDate: parsed.data.mealDate,
    mealType: parsed.data.mealType,
    productionBreakdown: rows,
  })
})

managerRouter.get('/tokens/live', async (req, res) => {
  const parsed = mealQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({ message: 'mealDate and mealType are required' })
  }

  const tokens = await MealOrderModel.find({
    mealDate: parsed.data.mealDate,
    mealType: parsed.data.mealType,
    status: { $in: ['BOOKED', 'DEFAULTED', 'SERVED'] },
  })
    .sort({ createdAt: 1 })
    .select({ tokenNo: 1, status: 1, studentId: 1 })

  return res.json({ tokens })
})

managerRouter.post('/tokens/serve-by-rfid', async (req, res) => {
  const body = z.object({
    rfid: z.string().min(1),
    mealDate: z.string(),
    mealType: z.enum(MEAL_TYPES),
  })
  const parsed = body.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({ message: 'rfid, mealDate, and mealType are required' })
  }

  const studentId = await resolveStudentByRfid(parsed.data.rfid)
  if (!studentId) {
    return res.status(404).json({ message: 'Student RFID not found' })
  }

  const order = await MealOrderModel.findOne({
    studentId,
    mealDate: parsed.data.mealDate,
    mealType: parsed.data.mealType,
    status: { $in: ['BOOKED', 'DEFAULTED'] },
  })

  if (!order) {
    return res.status(404).json({ message: 'No active meal found for RFID' })
  }

  order.status = 'SERVED'
  order.rfidScanAt = new Date()
  await order.save()

  return res.json({
    message: 'Meal marked as served',
    tokenNo: order.tokenNo,
    selections: order.selections,
    status: order.status
  })
})

managerRouter.get('/inventory/suggestions', async (req, res) => {
  const mealDate = String(req.query.mealDate ?? todayIstDate())
  const mealType = String(req.query.mealType ?? 'LUNCH') as MealType

  const counts = await MealOrderModel.aggregate([
    { $match: { mealDate, mealType, status: { $in: ['BOOKED', 'DEFAULTED'] } } },
    {
      $group: {
        _id: '$selections.topup',
        count: { $sum: 1 },
      },
    },
  ])

  return res.json({
    mealDate,
    mealType,
    suggestions: counts.map((item) => ({ ingredient: item._id ?? 'UNSPECIFIED', plannedUnits: item.count })),
  })
})

managerRouter.get('/revenue', async (req, res) => {
  const mealDate = String(req.query.mealDate ?? todayIstDate())

  const revenues = await MealOrderModel.aggregate([
    { $match: { mealDate, status: { $in: ['BOOKED', 'DEFAULTED', 'SERVED'] } } },
    {
      $group: {
        _id: '$mealType',
        amount: { $sum: '$price' },
      },
    },
  ])

  const refunds = await WalletTransactionModel.aggregate([
    { $match: { type: 'REFUND', createdAt: { $gte: new Date(`${mealDate}T00:00:00+05:30`) } } },
    {
      $group: {
        _id: null,
        amount: { $sum: '$amount' },
      },
    },
  ])

  return res.json({
    mealDate,
    revenueByMealType: revenues,
    refunds: refunds[0]?.amount ?? 0,
  })
})

managerRouter.post('/default-assignments/run', async (req, res) => {
  const parsed = mealQuerySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'mealDate and mealType are required' })
  }

  const result = await runDefaultAssignment(parsed.data.mealDate, parsed.data.mealType)
  return res.json({
    message: 'Default assignment run completed',
    ...result,
  })
})

managerRouter.get('/messes/capacity', async (req, res) => {
  const parsed = mealQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({ message: 'mealDate and mealType are required' })
  }

  const capacities = await MessCapacityModel.find({
    mealDate: parsed.data.mealDate,
    mealType: parsed.data.mealType,
  })

  return res.json({ capacities })
})

export { managerRouter }
