import { model, Schema, type InferSchemaType } from 'mongoose'

const mealOrderSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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
    messId: {
      type: Schema.Types.ObjectId,
      ref: 'Mess',
      required: true,
      index: true,
    },
    selections: {
      type: Map,
      of: Schema.Types.Mixed,
    },
    portion: {
      type: String,
      enum: ['HALF', 'FULL'],
      required: true,
    },
    status: {
      type: String,
      enum: ['BOOKED', 'SERVED', 'SKIPPED', 'NO_SHOW', 'DEFAULTED'],
      default: 'BOOKED',
    },
    tokenNo: {
      type: String,
      required: true,
      index: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    price: {
      type: Number,
      required: true,
    },
    baseFeePaid: {
      type: Number,
      default: 0,
    },
    mealCostPaid: {
      type: Number,
      default: 0,
    },
    rfidScanAt: {
      type: Date,
    },
    skipReason: {
      type: String,
    },
  },
  { timestamps: true },
)

mealOrderSchema.index({ studentId: 1, mealDate: 1, mealType: 1 }, { unique: true })

type MealOrderType = InferSchemaType<typeof mealOrderSchema>

const MealOrderModel = model<MealOrderType>('MealOrder', mealOrderSchema)

export { MealOrderModel, type MealOrderType }
