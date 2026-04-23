import bcrypt from 'bcryptjs'
import { MessModel } from '../models/Mess.js'
import { MessCapacityModel } from '../models/MessCapacity.js'
import { StudentProfileModel } from '../models/StudentProfile.js'
import { UserModel } from '../models/User.js'
import { WalletModel } from '../models/Wallet.js'
import { MEAL_TYPES } from '../constants.js'
import { generateDateRange, todayIstDate } from '../utils/time.js'

const DEFAULT_CAPACITY = 800

export async function seedDemoData() {
  const existingMesses = await MessModel.countDocuments()

  if (existingMesses === 0) {
    await MessModel.insertMany([
      { code: 'MESS_A', name: 'Annapurna Mess', ratingAvg: 4.3, status: 'ACTIVE' },
      { code: 'MESS_B', name: 'Swaad Mess', ratingAvg: 4.1, status: 'ACTIVE' },
      { code: 'MESS_C', name: 'Bhojanalaya Mess', ratingAvg: 3.8, status: 'ACTIVE' },
    ])
  }

  const managerExists = await UserModel.findOne({ role: 'MANAGER', username: 'manager1' })
  if (!managerExists) {
    const passwordHash = await bcrypt.hash('manager123', 10)
    await UserModel.create({
      role: 'MANAGER',
      username: 'manager1',
      passwordHash,
    })
  }

  const demoRoll = '2026CS001'
  const demoStudent = await UserModel.findOne({ role: 'STUDENT', rollNo: demoRoll })
  if (!demoStudent) {
    const passwordHash = await bcrypt.hash('student123', 10)
    const student = await UserModel.create({
      role: 'STUDENT',
      rollNo: demoRoll,
      passwordHash,
    })

    await StudentProfileModel.create({
      userId: student._id,
      rollNo: demoRoll,
      fullName: 'Demo Student',
      hostel: 'Hostel A',
      department: 'Computer Science',
      rfidTag: 'RFID-DEMO-001',
    })

    await WalletModel.create({
      studentId: student._id,
      openingCredit: 18000,
      availableBalance: 18000,
      blockedBalance: 0,
    })
  }

  const messes = await MessModel.find({ status: 'ACTIVE' })
  const today = todayIstDate()
  const range = generateDateRange(today, today)

  for (const mealDate of range) {
    for (const mealType of MEAL_TYPES) {
      for (const mess of messes) {
        await MessCapacityModel.updateOne(
          { messId: mess._id, mealDate, mealType },
          {
            $setOnInsert: {
              capacity: DEFAULT_CAPACITY,
              bookedCount: 0,
            },
          },
          { upsert: true },
        )
      }
    }
  }
}
