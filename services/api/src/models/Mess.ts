import { model, Schema, type InferSchemaType } from 'mongoose'

const messSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
    ratingAvg: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
)

type MessType = InferSchemaType<typeof messSchema>

const MessModel = model<MessType>('Mess', messSchema)

export { MessModel, type MessType }
