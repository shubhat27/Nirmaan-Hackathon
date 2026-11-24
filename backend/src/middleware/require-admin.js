import 'dotenv/config'
import jwt from 'jsonwebtoken'
import { pool } from '../db.js'

const jwtSecret = process.env.JWT_SECRET

if (!jwtSecret || Buffer.byteLength(jwtSecret, 'utf8') < 32) {
  throw new Error('JWT_SECRET must be set to a random value of at least 32 bytes.')
}

const jwtIssuer = 'nirmaan-hackathon'

export async function requireAdmin(request, response, next) {
  const authorization = request.get('authorization') || ''
  const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i)

  if (!tokenMatch) {
    return response.status(401).json({ message: 'Admin authentication is required.' })
  }

  try {
    const payload = jwt.verify(tokenMatch[1], jwtSecret, { issuer: jwtIssuer })
    if (typeof payload !== 'object' || typeof payload.sub !== 'string') {
      return response.status(401).json({ message: 'Admin token is invalid or expired.' })
    }

    const [admins] = await pool.execute(
      'SELECT id, username, is_active FROM admin_users WHERE id = ? LIMIT 1',
      [payload.sub],
    )
    const admin = admins[0]

    if (!admin || !admin.is_active) {
      return response.status(401).json({ message: 'Admin token is invalid or expired.' })
    }

    request.admin = { id: admin.id, username: admin.username }
    return next()
  } catch (error) {
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError' ||
      error.name === 'NotBeforeError'
    ) {
      return response.status(401).json({ message: 'Admin token is invalid or expired.' })
    }

    return next(error)
  }
}

export { jwtIssuer, jwtSecret }
