import { Schema, model, type Document, type Types } from 'mongoose'

export interface IMessReview extends Document {
  orderId: Types.ObjectId
  studentId: Types.ObjectId
  messId: Types.ObjectId
  rating: number
  ratingTaste: number
  ratingHygiene: number
  ratingWaitTime: number
  comment: string
  createdAt: Date
}

const MessReviewSchema = new Schema<IMessReview>({
  orderId: { type: Schema.Types.ObjectId, ref: 'MealOrder', required: true, unique: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  ratingTaste: { type: Number, default: 5 },
  ratingHygiene: { type: Number, default: 5 },
  ratingWaitTime: { type: Number, default: 5 },
  comment: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
})

export const MessReviewModel = model<IMessReview>('MessReview', MessReviewSchema)
