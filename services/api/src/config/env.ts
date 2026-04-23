import dotenv from 'dotenv'

dotenv.config()

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] ?? defaultValue
  if (value === undefined) {
    throw new Error(`Environment variable ${key} is missing`)
  }
  return value
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  studentOrigin: getEnv('STUDENT_APP_ORIGIN', 'http://localhost:5173'),
  managerOrigin: getEnv('MANAGER_APP_ORIGIN', 'http://localhost:5174'),
  mongoUri: getEnv('MONGODB_URI', 'mongodb://127.0.0.1:27017/optimess'),
  jwtSecret: getEnv('JWT_SECRET', 'optimess-dev-secret-change-me'),
  autoSeedDemo: process.env.AUTO_SEED_DEMO === 'true',
}
