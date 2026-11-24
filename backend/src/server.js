import 'dotenv/config'
import { app } from './app.js'
import { pool } from './db.js'

async function startServer() {
  try {
    await pool.query('SELECT 1')
  } catch (error) {
    console.error('Could not connect to MySQL. Check the backend .env settings:', error)
    await pool.end()
    process.exitCode = 1
    return
  }

  const port = Number(process.env.PORT || 5000)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('PORT must be a valid TCP port number.')
    await pool.end()
    process.exitCode = 1
    return
  }

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Nirmaan API is listening on port ${port}`)
  })

  server.on('error', async (error) => {
    console.error('Could not start the API server:', error)
    await pool.end()
    process.exitCode = 1
  })
}

await startServer()
