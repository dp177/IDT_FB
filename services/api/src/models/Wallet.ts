import { model, Schema, type InferSchemaType } from 'mongoose'

const walletSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    openingCredit: {
      type: Number,
      default: 18000,
    },
    availableBalance: {
      type: Number,
      default: 18000,
    },
    blockedBalance: {
      type: Number,
      default: 0,
    },
    lastBaseFeeDeductedAt: {
      type: String, // YYYY-MM-DD
    },
  },
  { timestamps: true },
)

type WalletType = InferSchemaType<typeof walletSchema>

const WalletModel = model<WalletType>('Wallet', walletSchema)

export { WalletModel, type WalletType }
