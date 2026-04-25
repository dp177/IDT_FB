import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.js'
import { connectDb } from './db.js'
import { authenticate } from './middleware/authenticate.js'
import { requireRole } from './middleware/requireRole.js'
import { authRouter } from './routes/auth.routes.js'
import { healthRouter } from './routes/health.routes.js'
import { managerRouter } from './routes/manager.routes.js'
import { studentRouter } from './routes/student.routes.js'
import { seedDemoData } from './services/seed.service.js'

const app = express()

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = new Set([
        env.studentOrigin,
        env.managerOrigin,
        ...env.allowedOrigins,
      ])

      if (!origin || origin.match(/^http:\/\/localhost:\d+$/) || allowedOrigins.has(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
)
app.use(helmet())
app.use(morgan('dev'))
app.use(express.json())

app.get('/', (_req, res) => {
  res.json({
    name: 'Optimess API',
    studentApp: env.studentOrigin,
    managerApp: env.managerOrigin,
  })
})

app.use('/health', healthRouter)
app.use('/auth', authRouter)
app.use('/student', authenticate, requireRole('STUDENT'), studentRouter)
app.use('/manager', authenticate, requireRole('MANAGER'), managerRouter)

async function start() {
  await connectDb()

  // Always seed demo data on startup (idempotent — skips if data exists)
  await seedDemoData()

  app.listen(env.port, () => {
    console.log(`Optimess API running on port ${env.port}`)
  })
}

start().catch((error) => {
  console.error('Failed to start API', error)
  process.exit(1)
})
