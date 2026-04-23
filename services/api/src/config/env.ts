import dotenv from 'dotenv'

dotenv.config()

export const env = {
  port: Number(process.env.PORT ?? 4000),
  studentOrigin: process.env.STUDENT_APP_ORIGIN ?? 'http://localhost:5173',
  managerOrigin: process.env.MANAGER_APP_ORIGIN ?? 'http://localhost:5174',
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/optimess',
  jwtSecret: process.env.JWT_SECRET ?? 'optimess-dev-secret',
  autoSeedDemo: process.env.AUTO_SEED_DEMO === 'true',
}
