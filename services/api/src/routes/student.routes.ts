import { Router } from 'express'
import { z } from 'zod'
import { DIETARY_PREFERENCES, MEAL_TYPES, PORTION_TYPES, STATIC_MENU, type MealType } from '../constants.js'
import { MealOrderModel } from '../models/MealOrder.js'
import { MessCapacityModel } from '../models/MessCapacity.js'
import { MessModel } from '../models/Mess.js'
import { StudentProfileModel } from '../models/StudentProfile.js'
import { MessReviewModel } from '../models/MessReview.js'
import { WalletModel } from '../models/Wallet.js'
import { createMealOrder, ensureStudentCanOrder, skipMealOrder } from '../services/booking.service.js'
import { bookingWindowEndIstDate, generateDateRange, isBeforeMealCutoff, isWithinBookingWindow, todayIstDate } from '../utils/time.js'

const studentRouter = Router()

const dietarySchema = z.object({
  dietaryPreference: z.enum(DIETARY_PREFERENCES),
})

const orderSchema = z.object({
  mealDate: z.string(),
  mealType: z.enum(MEAL_TYPES),
  messId: z.string().min(1),
  portion: z.enum(PORTION_TYPES),
  selections: z.record(z.string(), z.any()).optional(),
})

const skipSchema = z.object({
  mealDate: z.string(),
  mealType: z.enum(MEAL_TYPES),
  reason: z.string().min(1).max(120),
})

studentRouter.get('/me', async (req, res) => {
  const studentId = req.user!.id

  const [profile, wallet] = await Promise.all([
    StudentProfileModel.findOne({ userId: studentId }),
    WalletModel.findOne({ studentId }),
  ])

  if (!profile) {
    return res.status(404).json({ message: 'Student profile not found' })
  }

  return res.json({
    role: 'STUDENT',
    rollNo: profile.rollNo,
    fullName: profile.fullName,
    dietaryPreference: profile.dietaryPreference ?? null,
    dietaryPreferenceLockedAt: profile.dietaryPreferenceLockedAt ?? null,
    defaultSelections: (profile as any).defaultSelections || null,
    wallet: wallet?.availableBalance ?? 0,
    openingCredit: wallet?.openingCredit ?? 18000,
    bookingWindow: {
      fromDate: todayIstDate(),
      toDate: bookingWindowEndIstDate(),
      cutoffRule: 'Previous day midnight IST',
    },
  })
})

studentRouter.get('/wallet', async (req, res) => {
  const wallet = await WalletModel.findOne({ studentId: req.user!.id })
  if (!wallet) {
    return res.status(404).json({ message: 'Wallet not found' })
  }

  return res.json(wallet)
})

studentRouter.post('/preferences/dietary', async (req, res) => {
  const parsed = dietarySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid dietary preference payload' })
  }

  const profile = await StudentProfileModel.findOne({ userId: req.user!.id })
  if (!profile) {
    return res.status(404).json({ message: 'Student profile not found' })
  }

  if (profile.dietaryPreferenceLockedAt) {
    return res.status(409).json({ message: 'Dietary preference is permanently locked' })
  }

  profile.dietaryPreference = parsed.data.dietaryPreference
  profile.dietaryPreferenceLockedAt = new Date()
  await profile.save()

  return res.status(201).json({
    message: 'Dietary preference saved permanently',
    dietaryPreference: profile.dietaryPreference,
  })
})

studentRouter.post('/preferences/default-menu', async (req, res) => {
  const { defaultSelections } = req.body
  const profile = await StudentProfileModel.findOne({ userId: req.user!.id })
  if (!profile) return res.status(404).json({ message: 'Student profile not found' })

  profile.defaultSelections = defaultSelections
  await profile.save()

  return res.status(201).json({
    message: 'Default menu preferences saved',
    defaultSelections: profile.defaultSelections,
  })
})

studentRouter.get('/menu', async (req, res) => {
  const fromDate = String(req.query.fromDate ?? todayIstDate())
  const toDate = String(req.query.toDate ?? bookingWindowEndIstDate())

  if (!isWithinBookingWindow(fromDate) || !isWithinBookingWindow(toDate)) {
    return res.status(400).json({ message: 'Date range must stay within next 7 days' })
  }

  const profile = await StudentProfileModel.findOne({ userId: req.user!.id })
  const dates = generateDateRange(fromDate, toDate)

  return res.json({
    fromDate,
    toDate,
    dates,
    dietaryPreference: profile?.dietaryPreference ?? null,
    menu: STATIC_MENU,
    nutritionEnabled: true,
    allergyFlagsEnabled: true,
  })
})

studentRouter.get('/messes/availability', async (req, res) => {
  const mealDate = String(req.query.mealDate ?? '')
  const mealType = String(req.query.mealType ?? '') as MealType

  if (!mealDate || !MEAL_TYPES.includes(mealType)) {
    return res.status(400).json({ message: 'mealDate and valid mealType are required' })
  }

  const messes = await MessModel.find({ status: 'ACTIVE' }).sort({ name: 1 })
  const capacities = await MessCapacityModel.find({ mealDate, mealType })
  const capMap = new Map(capacities.map((item) => [String(item.messId), item]))

  return res.json({
    mealDate,
    mealType,
    options: messes.map((mess) => {
      const cap = capMap.get(String(mess._id))
      const capacity = cap?.capacity ?? 800
      const booked = cap?.bookedCount ?? 0

      return {
        messId: String(mess._id),
        name: mess.name,
        rating: mess.ratingAvg,
        capacity,
        booked,
        remaining: Math.max(capacity - booked, 0),
      }
    }),
  })
})

studentRouter.post('/orders', async (req, res) => {
  const parsed = orderSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid order payload' })
  }

  if (!isWithinBookingWindow(parsed.data.mealDate)) {
    return res.status(400).json({ message: 'Booking allowed only within next 7 days' })
  }

  if (!isBeforeMealCutoff(parsed.data.mealDate)) {
    return res.status(400).json({ message: 'Cutoff crossed: previous day midnight IST' })
  }

  try {
    await ensureStudentCanOrder(req.user!.id)
    const order = await createMealOrder({
      studentId: req.user!.id,
      mealDate: parsed.data.mealDate,
      mealType: parsed.data.mealType,
      messId: parsed.data.messId,
      portion: parsed.data.portion,
      selections: parsed.data.selections,
    })

    return res.status(201).json({
      message: 'Order created',
      tokenNo: order.tokenNo,
      order,
    })
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : 'Unable to create order',
    })
  }
})

studentRouter.post('/orders/skip', async (req, res) => {
  const parsed = skipSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid skip payload' })
  }

  if (!isBeforeMealCutoff(parsed.data.mealDate)) {
    return res.status(400).json({ message: 'Skip allowed only before previous day midnight IST cutoff' })
  }

  try {
    const skipped = await skipMealOrder(
      req.user!.id,
      parsed.data.mealDate,
      parsed.data.mealType,
      parsed.data.reason,
    )

    return res.status(201).json({
      message: 'Meal skipped and amount refunded',
      order: skipped,
    })
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : 'Unable to skip meal',
    })
  }
})

studentRouter.post('/orders/skip/batch', async (req, res) => {
  const { startDate, endDate, meals, reason } = req.body
  
  if (!startDate || !endDate || !meals || !Array.isArray(meals)) {
    return res.status(400).json({ message: 'startDate, endDate, and meals array are required' })
  }

  const dates = generateDateRange(startDate, endDate)
  const results = []

  for (const date of dates) {
    if (!isBeforeMealCutoff(date)) continue 
    
    for (const meal of meals) {
      try {
        const skipped = await skipMealOrder(req.user!.id, date, meal, reason || 'Leave Request')
        results.push({ date, meal, status: 'SKIPPED' })
      } catch (e) {
        // Silently skip if order doesn't exist or already skipped, 
        // because "Leave Request" is a blanket intent
      }
    }
  }

  return res.json({ message: 'Leave request processed', count: results.length })
})

studentRouter.get('/orders/history', async (req, res) => {
  const orders = await MealOrderModel.find({ studentId: req.user!.id })
    .sort({ mealDate: -1, createdAt: -1 })
    .limit(100)
    .lean()

  const reviews = await MessReviewModel.find({ studentId: req.user!.id })
  const reviewedOrderIds = new Set(reviews.map((r) => String(r.orderId)))

  const ordersWithReview = (orders as any[]).map((o) => ({
    ...o,
    isReviewed: reviewedOrderIds.has(String(o._id)),
  }))

  return res.json({ orders: ordersWithReview })
})

studentRouter.post('/orders/:id/review', async (req, res) => {
  const { rating, ratingTaste, ratingHygiene, ratingWaitTime, comment } = req.body
  const orderId = req.params.id

  const order = await MealOrderModel.findOne({ _id: orderId, studentId: req.user!.id })
  if (!order) return res.status(404).json({ message: 'Order not found' })
  if (order.status !== 'SERVED') return res.status(400).json({ message: 'Can only review served meals' })

  const existing = await MessReviewModel.findOne({ orderId })
  if (existing) return res.status(400).json({ message: 'Already reviewed' })

  const review = await MessReviewModel.create({
    orderId,
    studentId: req.user!.id,
    messId: order.messId,
    rating,
    ratingTaste,
    ratingHygiene,
    ratingWaitTime,
    comment,
  })

  // Update Mess average rating
  const allReviews = await MessReviewModel.find({ messId: order.messId })
  const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
  await MessModel.findByIdAndUpdate(order.messId, { ratingAvg: avg })

  return res.json(review)
})

studentRouter.get('/messes/:id/reviews', async (req, res) => {
  const reviews = await MessReviewModel.find({ messId: req.params.id })
    .populate('studentId', 'fullName')
    .sort({ createdAt: -1 })
  return res.json(reviews)
})

studentRouter.get('/reviews/comparison', async (req, res) => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  const messes = await MessModel.find({ status: 'ACTIVE' }, 'name ratingAvg').lean()
  
  const stats = await MessReviewModel.aggregate([
    {
      $group: {
        _id: '$messId',
        avgToday: {
          $avg: { $cond: [{ $gte: ['$createdAt', today] }, '$rating', null] }
        },
        countToday: {
          $sum: { $cond: [{ $gte: ['$createdAt', today] }, 1, 0] }
        },
        avgTaste: { $avg: '$ratingTaste' },
        avgHygiene: { $avg: '$ratingHygiene' },
        avgWait: { $avg: '$ratingWaitTime' }
      }
    }
  ])

  const results = messes.map(m => {
    const s = stats.find(st => String(st._id) === String(m._id))
    return {
      name: m.name,
      today: s?.avgToday || 0,
      todayCount: s?.countToday || 0,
      taste: s?.avgTaste || 0,
      hygiene: s?.avgHygiene || 0,
      waitTime: s?.avgWait || 0,
      week: m.ratingAvg, // Using m.ratingAvg as fallback for now
      month: m.ratingAvg,
      weekCount: s?.countToday || 0, // Placeholder
      monthCount: s?.countToday || 0  // Placeholder
    }
  })

  return res.json(results)
})

studentRouter.get('/reviews/all', async (req, res) => {
  const reviews = await MessReviewModel.find()
    .populate('studentId', 'fullName')
    .populate('messId', 'name')
    .sort({ createdAt: -1 })
    .limit(50)
  return res.json(reviews)
})

studentRouter.get('/token/current', async (req, res) => {
  const mealDate = String(req.query.mealDate ?? todayIstDate())
  const mealType = String(req.query.mealType ?? '') as MealType

  if (!MEAL_TYPES.includes(mealType)) {
    return res.status(400).json({ message: 'Valid mealType is required' })
  }

  const order = await MealOrderModel.findOne({
    studentId: req.user!.id,
    mealDate,
    mealType,
    status: { $in: ['BOOKED', 'DEFAULTED'] },
  })

  if (!order) {
    return res.status(404).json({ message: 'No active token for selected meal' })
  }

  return res.json({
    tokenNo: order.tokenNo,
    status: order.status,
    mealDate,
    mealType,
  })
})

export { studentRouter }
