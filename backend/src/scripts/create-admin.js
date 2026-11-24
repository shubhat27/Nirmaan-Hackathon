import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { createInterface } from 'node:readline/promises'
import process from 'node:process'
import { pool } from '../db.js'

function readHiddenPassword() {
  const input = process.stdin
  if (!input.isTTY || typeof input.setRawMode !== 'function') {
    throw new Error('Run this command from an interactive terminal.')
  }

  return new Promise((resolve, reject) => {
    let password = ''

    function finish(error) {
      input.off('data', handleData)
      input.setRawMode(false)
      input.pause()
      process.stdout.write('\n')
      if (error) reject(error)
      else resolve(password)
    }

    function handleData(buffer) {
      for (const character of buffer.toString('utf8')) {
        if (character === '\u0003') {
          finish(new Error('Admin account creation was cancelled.'))
          return
        }
        if (character === '\r' || character === '\n') {
          finish()
          return
        }
        if (character === '\u007f' || character === '\b') {
          password = password.slice(0, -1)
        } else {
          password += character
        }
      }
    }

    process.stdout.write('Admin password (input hidden): ')
    input.setRawMode(true)
    input.resume()
    input.on('data', handleData)
  })
}

async function createAdmin() {
  const prompt = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  let username
  try {
    username = (await prompt.question('Admin username: ')).trim()
  } finally {
    prompt.close()
  }

  if (!username || username.length > 100) {
    throw new Error('Admin username must be between 1 and 100 characters.')
  }

  const password = await readHiddenPassword()
  const passwordBytes = Buffer.byteLength(password, 'utf8')
  if (passwordBytes < 12 || passwordBytes > 72) {
    throw new Error('Admin password must be between 12 and 72 UTF-8 bytes.')
  }

  const passwordHash = await bcrypt.hash(password, 12)
  await pool.execute(
    'INSERT INTO admin_users (username, password_hash) VALUES (?, ?)',
    [username, passwordHash],
  )

  console.log('Admin account created. Keep the password private.')
}

try {
  await createAdmin()
} catch (error) {
  if (error.code === 'ER_DUP_ENTRY') {
    console.error('An admin account with that username already exists.')
  } else {
    console.error('Could not create the admin account:', error.message)
  }
  process.exitCode = 1
} finally {
  await pool.end()
}
