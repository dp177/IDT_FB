import { model, Schema, type InferSchemaType } from 'mongoose'

const studentProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    rollNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    fullName: {
      type: String,
      default: '',
    },
    hostel: {
      type: String,
      default: '',
    },
    department: {
      type: String,
      default: '',
    },
    dietaryPreference: {
      type: String,
      enum: ['JAIN', 'NON_JAIN'],
    },
    dietaryPreferenceLockedAt: {
      type: Date,
    },
    rfidTag: {
      type: String,
      unique: true,
      sparse: true,
    },
    defaultSelections: {
      type: Map,
      of: Schema.Types.Mixed,
    },
  },
  { timestamps: true },
)

type StudentProfileType = InferSchemaType<typeof studentProfileSchema>

const StudentProfileModel = model<StudentProfileType>('StudentProfile', studentProfileSchema)

export { StudentProfileModel, type StudentProfileType }
