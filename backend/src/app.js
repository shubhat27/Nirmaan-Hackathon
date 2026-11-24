import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import authRouter from './routes/auth.js'
import registrationsRouter from './routes/registrations.js'

const app = express()
const allowedOrigins = (
  process.env.FRONTEND_ORIGINS ||
  'http://localhost:5173,http://127.0.0.1:5173'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.disable('x-powered-by')
app.use(helmet())
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true)
      }

      const error = new Error('Origin is not allowed by CORS.')
      error.status = 403
      return callback(error)
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
)
app.use(express.json({ limit: '16kb' }))

app.get('/api/health', (request, response) => {
  response.json({ status: 'ok' })
})

app.use('/api/auth', authRouter)
app.use('/api/registrations', registrationsRouter)

app.use((request, response) => {
  response.status(404).json({ message: 'API route not found.' })
})

app.use((error, request, response, next) => {
  console.error('API request failed:', error)

  if (response.headersSent) {
    return next(error)
  }

  let statusCode = 500
  let message = 'An unexpected server error occurred.'

  if (error.type === 'entity.parse.failed') {
    statusCode = 400
    message = 'Request body must contain valid JSON.'
  } else if (error.type === 'entity.too.large') {
    statusCode = 413
    message = 'Request body is too large.'
  } else if (error.status === 403) {
    statusCode = 403
    message = 'This frontend origin is not allowed.'
  }

  return response.status(statusCode).json({ message })
})

export { app }
