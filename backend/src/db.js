import 'dotenv/config'
import { createPool } from 'mysql2/promise'

const port = Number(process.env.DB_PORT || 3306)
const sslEnabled = process.env.DB_SSL === 'true'
const sslCa = process.env.DB_SSL_CA?.replace(/\\n/g, '\n').trim()

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('DB_PORT must be a valid TCP port number.')
}

if (sslEnabled && !sslCa) {
  throw new Error('DB_SSL_CA is required when DB_SSL=true.')
}

export const pool = createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nirmaan_hackathon',
  ...(sslEnabled
    ? { ssl: { ca: sslCa, rejectUnauthorized: true } }
    : {}),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})
