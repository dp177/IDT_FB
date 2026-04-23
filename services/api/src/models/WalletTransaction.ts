import { model, Schema, type InferSchemaType } from 'mongoose'

const walletTransactionSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['CREDIT', 'DEBIT', 'REFUND', 'ADJUSTMENT'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    mealOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'MealOrder',
    },
    note: {
      type: String,
      default: '',
    },
  },
  { timestamps: true },
)

type WalletTransactionType = InferSchemaType<typeof walletTransactionSchema>

const WalletTransactionModel = model<WalletTransactionType>('WalletTransaction', walletTransactionSchema)

export { WalletTransactionModel, type WalletTransactionType }
