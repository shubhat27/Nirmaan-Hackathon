import bcrypt from 'bcryptjs'
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import jwt from 'jsonwebtoken'
import { pool } from '../db.js'
import { jwtIssuer, jwtSecret, requireAdmin } from '../middleware/require-admin.js'

const router = Router()
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please wait and try again.' },
})

router.post('/login', loginLimiter, async (request, response, next) => {
  const { username, password } = request.body || {}

  if (
    typeof username !== 'string' ||
    !username.trim() ||
    username.trim().length > 100 ||
    typeof password !== 'string' ||
    !password ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    return response.status(400).json({
      message: 'A valid admin username and password are required.',
    })
  }

  try {
    const [admins] = await pool.execute(
      `SELECT id, username, password_hash, is_active
       FROM admin_users
       WHERE username = ?
       LIMIT 1`,
      [username.trim()],
    )
    const admin = admins[0]

    if (
      !admin ||
      !admin.is_active ||
      !(await bcrypt.compare(password, admin.password_hash))
    ) {
      return response.status(401).json({ message: 'Invalid username or password.' })
    }

    const token = jwt.sign(
      { sub: String(admin.id) },
      jwtSecret,
      { expiresIn: '1h', issuer: jwtIssuer },
    )

    return response.json({
      token,
      tokenType: 'Bearer',
      expiresIn: 3600,
      admin: { id: admin.id, username: admin.username },
    })
  } catch (error) {
    return next(error)
  }
})

router.get('/me', requireAdmin, (request, response) => {
  response.json({ admin: request.admin })
})

export default router
