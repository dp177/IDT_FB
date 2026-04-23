import mongoose from 'mongoose'
import { MessModel } from './models/Mess.js'

const MONGODB_URI = 'mongodb+srv://dakshjkhadalpur177_db_user:EIABsJJKb8FJu97a@clus.91akywj.mongodb.net/accredian_enquiries?retryWrites=true&w=majority'

async function main() {
  await mongoose.connect(MONGODB_URI)
  console.log('✓ Connected to MongoDB:', MONGODB_URI)

  const count = await MessModel.countDocuments()
  console.log('Existing messes:', count)

  if (count === 0) {
    await MessModel.insertMany([
      { code: 'MESS_A', name: 'Annapurna Mess', ratingAvg: 4.3, status: 'ACTIVE' },
      { code: 'MESS_B', name: 'Swaad Mess', ratingAvg: 4.1, status: 'ACTIVE' },
      { code: 'MESS_C', name: 'Bhojanalaya Mess', ratingAvg: 3.8, status: 'ACTIVE' },
    ])
    console.log('✓ Seeded 3 messes')
  } else {
    // Ensure all messes are ACTIVE
    const result = await MessModel.updateMany({}, { $set: { status: 'ACTIVE' } })
    console.log('✓ Set all', result.modifiedCount, 'messes to ACTIVE')
    const all = await MessModel.find().lean()
    console.log('All messes:', all.map(m => ({ name: m.name, status: m.status, rating: m.ratingAvg })))
  }

  await mongoose.disconnect()
  console.log('Done.')
}

main().catch(e => { console.error(e); process.exit(1) })
