import mongoose from 'mongoose'
import { connectDb } from '../src/db.js'
import { MessModel } from '../src/models/Mess.js'
import { MessReviewModel } from '../src/models/MessReview.js'
import { MealOrderModel } from '../src/models/MealOrder.js'
import { UserModel } from '../src/models/User.js'
import { StudentProfileModel } from '../src/models/StudentProfile.js'

async function setupTestData() {
  await connectDb()

  // 1. Reset all mess ratings to 0
  console.log('Resetting mess ratings...')
  await MessModel.updateMany({}, { ratingAvg: 0, reviewCount: 0 })
  await MessReviewModel.deleteMany({}) // Clear all reviews

  // 2. Find or create the specific student
  console.log('Setting up student 23dcs501...')
  let user = await UserModel.findOne({ rollNo: '23dcs501' })
  if (!user) {
    user = await UserModel.create({
      rollNo: '23dcs501',
      password: 'password123', // Default password
      role: 'STUDENT',
      status: 'ACTIVE'
    })
  }

  let profile = await StudentProfileModel.findOne({ userId: user._id })
  if (!profile) {
    profile = await StudentProfileModel.create({
      userId: user._id,
      rollNo: '23dcs501',
      fullName: 'Student 23dcs501',
      dietaryPreference: 'JAIN'
    })
  } else {
    profile.fullName = 'Student 23dcs501'
    profile.dietaryPreference = 'JAIN'
    await profile.save()
  }

  // 3. Create a SERVED order for this student to allow manual review
  console.log('Creating served order for testing...')
  const firstMess = await MessModel.findOne({ status: 'ACTIVE' })
  if (firstMess) {
    await MealOrderModel.create({
      studentId: user._id,
      messId: firstMess._id,
      mealDate: new Date().toISOString().slice(0, 10),
      mealType: 'LUNCH',
      status: 'SERVED',
      tokenNo: 'TEST-999',
      portion: 'FULL',
      price: 15,
      selections: { main: { id: 'red-gravy', portion: 'FULL' } }
    })
  }

  console.log('Done! User 23dcs501 can now log in and rate their LUNCH.')
  process.exit(0)
}

setupTestData()
