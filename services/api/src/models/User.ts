import { model, Schema, type InferSchemaType } from 'mongoose'

const userSchema = new Schema(
  {
    role: {
      type: String,
      enum: ['STUDENT', 'MANAGER'],
      required: true,
    },
    rollNo: {
      type: String,
      index: true,
      unique: true,
      sparse: true,
      trim: true,
    },
    username: {
      type: String,
      index: true,
      unique: true,
      sparse: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: 'ACTIVE',
      enum: ['ACTIVE', 'DISABLED'],
    },
  },
  { timestamps: true },
)

type UserType = InferSchemaType<typeof userSchema>

const UserModel = model<UserType>('User', userSchema)

export { UserModel, type UserType }
