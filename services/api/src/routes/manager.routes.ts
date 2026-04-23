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

  // Aggregate every individual selection across all keys
  const orders = await MealOrderModel.find({ 
    mealDate: parsed.data.mealDate, 
    mealType: parsed.data.mealType, 
    status: { $in: ['BOOKED', 'DEFAULTED', 'SERVED'] } 
  })

  const detailedCounts: Record<string, number> = {}
  let totalRotis = 0
  
  orders.forEach(order => {
    order.selections.forEach((value: any, key: string) => {
      const itemId = typeof value === 'object' ? value.id : value
      const portion = typeof value === 'object' ? value.portion : null
      
      if (!itemId || itemId === 'No Rice') return
      
      if (key === 'rotiCount') {
        totalRotis += Number(itemId)
        return
      }
      
      const compositeKey = portion && portion !== 'FULL' ? `${itemId} (${portion})` : `${itemId}`
      detailedCounts[compositeKey] = (detailedCounts[compositeKey] || 0) + 1
    })
  })

  const finalItems = Object.entries(detailedCounts).map(([name, count]) => ({ name, count }))
  if (totalRotis > 0) {
    finalItems.unshift({ name: `🔥 TOTAL ROTIS`, count: totalRotis })
  }

  return res.json({
    mealDate: parsed.data.mealDate,
    mealType: parsed.data.mealType,
    detailedCounts: finalItems,
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

managerRouter.get('/forecast', async (req, res) => {
  const days = Number(req.query.days ?? 5)
  const dateList = Array.from({ length: days + 1 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d.toISOString().slice(0, 10)
  })

  const forecast = await MealOrderModel.aggregate([
    { $match: { mealDate: { $in: dateList }, status: { $in: ['BOOKED', 'DEFAULTED'] } } },
    {
      $group: {
        _id: { date: '$mealDate', type: '$mealType' },
        totalOrders: { $sum: 1 },
        selections: { $push: '$selections' }
      },
    },
    { $sort: { '_id.date': 1, '_id.type': 1 } }
  ])

  const detailedForecast = forecast.map(f => {
    const counts: Record<string, number> = {}
    let totalRotis = 0

    f.selections.forEach((sel: any) => {
      Object.entries(sel).forEach(([key, val]: [string, any]) => {
        const id = typeof val === 'object' ? val.id : val
        const portion = typeof val === 'object' ? val.portion : null
        if (!id || id === 'No Rice') return
        
        if (key === 'rotiCount') {
          totalRotis += Number(id)
          return
        }

        const compositeKey = portion && portion !== 'FULL' ? `${id} (${portion})` : `${id}`
        counts[compositeKey] = (counts[compositeKey] || 0) + 1
      })
    })

    const items = Object.entries(counts).map(([name, count]) => ({ name, count }))
    if (totalRotis > 0) {
      items.unshift({ name: '🔥 TOTAL ROTIS', count: totalRotis })
    }

    return {
      _id: f._id,
      totalOrders: f.totalOrders,
      items
    }
  })

  return res.json({ forecast: detailedForecast })
})

managerRouter.get('/inventory/materials', async (req, res) => {
  const mealDate = String(req.query.mealDate ?? todayIstDate())
  const mealType = String(req.query.mealType ?? 'LUNCH') as MealType

  const orders = await MealOrderModel.find({ 
    mealDate, mealType, status: { $in: ['BOOKED', 'DEFAULTED', 'SERVED'] } 
  })

  const rawMaterials: Record<string, { amount: number, unit: string }> = {
    'Wheat Flour': { amount: 0, unit: 'kg' },
    'Basmati Rice': { amount: 0, unit: 'kg' },
    'Paneer': { amount: 0, unit: 'kg' },
    'Potatoes': { amount: 0, unit: 'kg' },
    'Onions': { amount: 0, unit: 'kg' },
    'Tomatoes': { amount: 0, unit: 'kg' },
    'Oil': { amount: 0, unit: 'L' },
    'Butter/Ghee': { amount: 0, unit: 'kg' },
    'Ginger-Garlic Paste': { amount: 0, unit: 'kg' },
    'Green Chillies': { amount: 0, unit: 'kg' },
    'Milk/Cream': { amount: 0, unit: 'L' },
    'Dal/Lentils': { amount: 0, unit: 'kg' },
    'Eggs': { amount: 0, unit: 'pcs' },
    'Salt & Basic Spices': { amount: 0, unit: 'kg' },
  }

  orders.forEach(order => {
    const isHalf = order.portion === 'HALF'
    const mult = isHalf ? 0.6 : 1

    order.selections.forEach((value: any, key: string) => {
      const id = typeof value === 'object' ? value.id : value
      if (!id) return

      // --- MAPPING LOGIC ---
      if (key === 'rotiCount') {
        rawMaterials['Wheat Flour'].amount += Number(id) * 0.045
        rawMaterials['Butter/Ghee'].amount += Number(id) * 0.005
      }
      if (id.includes('Rice')) rawMaterials['Basmati Rice'].amount += 0.15 * mult
      if (id.includes('paneer')) rawMaterials['Paneer'].amount += 0.12 * mult
      if (id.includes('aloo') || id === 'samosa' || id === 'pav-bhaji') rawMaterials['Potatoes'].amount += 0.15 * mult
      if (key === 'dal' || id === 'chhole' || id === '4-vada') rawMaterials['Dal/Lentils'].amount += 0.08 * mult
      if (id.includes('Egg') || id === 'omelette') rawMaterials['Eggs'].amount += 2
      if (id === '2-dosa' || id === '3-idli') rawMaterials['Basmati Rice'].amount += 0.12 * mult
      
      // General estimates for gravies/snacks/dals
      if (['base', 'topup', 'dry', 'hot', 'dal'].includes(key)) {
        rawMaterials['Oil'].amount += 0.015 * mult
        rawMaterials['Onions'].amount += 0.06 * mult
        rawMaterials['Tomatoes'].amount += 0.05 * mult
        rawMaterials['Ginger-Garlic Paste'].amount += 0.01 * mult
        rawMaterials['Green Chillies'].amount += 0.005 * mult
        rawMaterials['Salt & Basic Spices'].amount += 0.008 * mult
      }
      
      if (id.includes('tea') || id.includes('coffee') || id === 'shake' || id === 'dal-makhani') {
        rawMaterials['Milk/Cream'].amount += 0.15
      }
    })
  })

  const materials = Object.entries(rawMaterials)
    .filter(([_, data]) => data.amount > 0)
    .map(([name, data]) => ({ name, amount: data.amount.toFixed(2), unit: data.unit }))

  return res.json({ materials })
})

managerRouter.get('/reviews/all', async (req, res) => {
  const { MessReviewModel } = await import('../models/MessReview.js')
  const reviews = await MessReviewModel.find()
    .populate('studentId', 'fullName rollNo')
    .populate('messId', 'name')
    .sort({ createdAt: -1 })
    .limit(50)
  return res.json(reviews)
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
