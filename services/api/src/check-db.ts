import mongoose from 'mongoose'
import { MessModel } from './models/Mess.js'

const MONGODB_URI = 'mongodb+srv://dakshjkhadalpur177_db_user:EIABsJJKb8FJu97a@clus.91akywj.mongodb.net/accredian_enquiries?retryWrites=true&w=majority'

async function main() {
  await mongoose.connect(MONGODB_URI)
  const messes = await MessModel.find().lean()
  console.log('MESSES IN DB:', JSON.stringify(messes, null, 2))
  await mongoose.disconnect()
}

main().catch(console.error)
