import { model, Schema, type InferSchemaType } from 'mongoose'

const messCapacitySchema = new Schema(
  {
    messId: {
      type: Schema.Types.ObjectId,
      ref: 'Mess',
      required: true,
      index: true,
    },
    mealDate: {
      type: String,
      required: true,
      index: true,
    },
    mealType: {
      type: String,
      enum: ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'],
      required: true,
      index: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 0,
    },
    bookedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
)

messCapacitySchema.index({ messId: 1, mealDate: 1, mealType: 1 }, { unique: true })

type MessCapacityType = InferSchemaType<typeof messCapacitySchema>

const MessCapacityModel = model<MessCapacityType>('MessCapacity', messCapacitySchema)

export { MessCapacityModel, type MessCapacityType }
