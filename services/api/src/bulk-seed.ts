import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { UserModel } from './models/User.js'
import { StudentProfileModel } from './models/StudentProfile.js'
import { WalletModel } from './models/Wallet.js'
import { WalletTransactionModel } from './models/WalletTransaction.js'

// MongoDB connection string from user
const MONGODB_URI = 'mongodb+srv://dakshjkhadalpur177_db_user:EIABsJJKb8FJu97a@clus.91akywj.mongodb.net/accredian_enquiries?retryWrites=true&w=majority'

async function connectDb() {
  await mongoose.connect(MONGODB_URI)
  console.log('✓ Connected to MongoDB')
}

async function seedManagers() {
  const managers = [
    { username: 'messA', password: 'adminA' },
    { username: 'messB', password: 'adminB' },
    { username: 'messC', password: 'adminC' },
  ]

  for (const { username, password } of managers) {
    const exists = await UserModel.findOne({ role: 'MANAGER', username })
    if (!exists) {
      const passwordHash = await bcrypt.hash(password, 10)
      await UserModel.create({
        role: 'MANAGER',
        username,
        passwordHash,
      })
      console.log(`✓ Created manager: ${username}`)
    } else {
      console.log(`- Manager ${username} already exists`)
    }
  }
}

async function seedStudents() {
  // Define student ranges
  const ranges = [
    { prefix: '23dcs', start: 501, end: 510 },    // 10 students
    { prefix: '23ucs', start: 501, end: 800 },    // 300 students
    { prefix: '23ece', start: 501, end: 800 },    // 300 students
  ]

  let createdCount = 0
  let skippedCount = 0

  for (const { prefix, start, end } of ranges) {
    console.log(`\n📋 Seeding ${prefix}${start}-${end}...`)
    
    // Batch process in groups of 50
    const batchSize = 50
    for (let i = start; i <= end; i += batchSize) {
      const batchEnd = Math.min(i + batchSize - 1, end)
      const rollNumbers = []
      
      for (let j = i; j <= batchEnd; j++) {
        rollNumbers.push(`${prefix}${j}`)
      }

      // Check which ones don't exist
      const existing = await UserModel.find({
        role: 'STUDENT',
        rollNo: { $in: rollNumbers }
      }).select('rollNo')
      const existingRolls = new Set(existing.map(e => e.rollNo))
      const newRolls = rollNumbers.filter(r => !existingRolls.has(r))

      if (newRolls.length > 0) {
        // Create users in batch
        const userDocs = newRolls.map(rollNo => ({
          role: 'STUDENT',
          rollNo,
          passwordHash: bcrypt.hashSync(`student${rollNo}`, 10),
        }))
        
        const createdUsers = await UserModel.insertMany(userDocs, { ordered: false })
        
        // Create profiles
        const profileDocs = createdUsers.map(user => ({
          userId: user._id,
          rollNo: user.rollNo,
          fullName: `Student ${user.rollNo}`,
          hostel: 'Hostel',
          department: getDepartment(prefix),
          rfidTag: `RFID-${user.rollNo}`,
        }))
        
        await StudentProfileModel.insertMany(profileDocs, { ordered: false })
        
        // Create wallets
        const walletDocs = createdUsers.map(user => ({
          studentId: user._id,
          openingCredit: 18000,
          availableBalance: 18000,
          blockedBalance: 0,
        }))
        
        await WalletModel.insertMany(walletDocs, { ordered: false })
        
        // Create transactions
        const transactionDocs = createdUsers.map(user => ({
          studentId: user._id,
          type: 'CREDIT',
          amount: 18000,
          note: 'Opening credit',
        }))
        
        await WalletTransactionModel.insertMany(transactionDocs, { ordered: false })
        
        createdCount += createdUsers.length
        console.log(`  ✓ Created batch: ${i}-${batchEnd} (${createdUsers.length} students)`)
      }
      
      skippedCount += existingRolls.size
    }
  }

  console.log(`\n✓ Student seeding complete: ${createdCount} created, ${skippedCount} skipped`)
}

async function main() {
  try {
    await connectDb()

    console.log('\n📋 Seeding managers...')
    await seedManagers()

    console.log('\n📋 Seeding students (610 total)...')
    await seedStudents()

    console.log('\n✅ Bulk seeding complete!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error during seeding:', error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
  }
}

function getDepartment(prefix: string): string {
  const departments: Record<string, string> = {
    '23dcs': 'Computer Science',
    '23ucs': 'Computer Science',
    '23ece': 'Electronics',
  }
  return departments[prefix] || 'General'
}

main()

