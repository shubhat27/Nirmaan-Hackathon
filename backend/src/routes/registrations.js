import { randomBytes } from 'node:crypto'
import { Router } from 'express'
import { pool } from '../db.js'
import { requireAdmin } from '../middleware/require-admin.js'

const router = Router()

const requiredFields = {
  studentName: 120,
  email: 254,
  phoneNumber: 24,
  usn: 40,
  department: 100,
  collegeName: 180,
  projectTitle: 160,
  projectDescription: 2000,
  technologiesUsed: 500,
}

function validateRegistration(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      values: {},
      errors: { form: 'Request body must be a JSON object.' },
    }
  }

  const values = {}
  const errors = {}

  for (const [field, maxLength] of Object.entries(requiredFields)) {
    const value = input[field]

    if (typeof value !== 'string') {
      errors[field] = 'This field is required and must be text.'
      continue
    }

    const trimmedValue = value.trim()
    if (!trimmedValue) {
      errors[field] = 'This field is required.'
    } else if (trimmedValue.length > maxLength) {
      errors[field] = `Must be ${maxLength} characters or fewer.`
    } else {
      values[field] = trimmedValue
    }
  }

  if (typeof values.email === 'string') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      errors.email = 'Enter a valid email address.'
    } else {
      values.email = values.email.toLowerCase()
    }
  }

  if (typeof values.phoneNumber === 'string') {
    const digits = values.phoneNumber.replace(/\D/g, '')
    if (
      !/^\+?[\d\s().-]+$/.test(values.phoneNumber) ||
      digits.length < 7 ||
      digits.length > 15
    ) {
      errors.phoneNumber = 'Enter a valid phone number with 7 to 15 digits.'
    }
  }

  if (typeof values.usn === 'string') {
    values.usn = values.usn.toUpperCase()
  }

  const githubUrl = input.githubUrl
  if (githubUrl == null) {
    values.githubUrl = null
  } else if (typeof githubUrl !== 'string') {
    errors.githubUrl = 'GitHub repository URL must be text.'
  } else {
    const trimmedUrl = githubUrl.trim()

    if (!trimmedUrl) {
      values.githubUrl = null
    } else if (trimmedUrl.length > 500) {
      errors.githubUrl = 'GitHub repository URL must be 500 characters or fewer.'
    } else {
      try {
        const url = new URL(trimmedUrl)
        const isGithubRepository =
          url.protocol === 'https:' &&
          ['github.com', 'www.github.com'].includes(url.hostname) &&
          !url.username &&
          !url.password &&
          url.pathname.split('/').filter(Boolean).length >= 2

        if (!isGithubRepository) {
          errors.githubUrl = 'Use a secure GitHub repository link.'
        } else {
          values.githubUrl = trimmedUrl
        }
      } catch {
        errors.githubUrl = 'Enter a valid GitHub repository URL.'
      }
    }
  }

  return { values, errors }
}

function getFilters(query) {
  const conditions = []
  const parameters = []

  if (query.search !== undefined) {
    if (typeof query.search !== 'string' || query.search.trim().length > 100) {
      return { error: 'Search must be 100 characters or fewer.' }
    }

    const search = query.search.trim()
    if (search) {
      const searchTerm = `%${search}%`
      conditions.push(
        '(student_name LIKE ? OR usn LIKE ? OR college_name LIKE ?)',
      )
      parameters.push(searchTerm, searchTerm, searchTerm)
    }
  }

  if (query.department !== undefined) {
    if (
      typeof query.department !== 'string' ||
      query.department.trim().length > 100
    ) {
      return { error: 'Department filter must be 100 characters or fewer.' }
    }

    const department = query.department.trim()
    if (department) {
      conditions.push('department = ?')
      parameters.push(department)
    }
  }

  return {
    error: null,
    where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    parameters,
  }
}

function parsePositiveInteger(value, defaultValue, maximum) {
  if (value === undefined) return defaultValue
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null

  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    return null
  }

  return parsed
}

function csvCell(value) {
  const text = value instanceof Date ? value.toISOString() : String(value ?? '')
  const safeText = /^[\u0000-\u0020]*[=+\-@]/.test(text) ? `'${text}` : text
  return `"${safeText.replace(/"/g, '""')}"`
}

const registrationSelect = `SELECT
  registration_id AS registrationId,
  student_name AS studentName,
  email,
  phone_number AS phoneNumber,
  usn,
  department,
  college_name AS collegeName,
  project_title AS projectTitle,
  project_description AS projectDescription,
  technologies_used AS technologiesUsed,
  github_url AS githubUrl,
  created_at AS createdAt,
  updated_at AS updatedAt
  FROM student_registrations`

router.post('/', async (request, response, next) => {
  const { values, errors } = validateRegistration(request.body)

  if (Object.keys(errors).length > 0) {
    return response.status(400).json({
      message: 'Please correct the registration details.',
      errors,
    })
  }

  const registrationId = `NIR-${new Date().getUTCFullYear()}-${randomBytes(10)
    .toString('hex')
    .toUpperCase()}`

  try {
    await pool.execute(
      `INSERT INTO student_registrations (
        registration_id,
        student_name,
        email,
        phone_number,
        usn,
        department,
        college_name,
        project_title,
        project_description,
        technologies_used,
        github_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        registrationId,
        values.studentName,
        values.email,
        values.phoneNumber,
        values.usn,
        values.department,
        values.collegeName,
        values.projectTitle,
        values.projectDescription,
        values.technologiesUsed,
        values.githubUrl,
      ],
    )

    return response.status(201).json({
      message: 'Registration submitted successfully.',
      registrationId,
    })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return response.status(409).json({
        message: 'This email address or USN is already registered.',
      })
    }

    return next(error)
  }
})

router.use(requireAdmin)

router.get('/export.csv', async (request, response, next) => {
  const filters = getFilters(request.query)
  if (filters.error) {
    return response.status(400).json({ message: filters.error })
  }

  try {
    const [registrations] = await pool.execute(
      `${registrationSelect} ${filters.where} ORDER BY created_at DESC`,
      filters.parameters,
    )
    const columns = [
      ['registrationId', 'Registration ID'],
      ['studentName', 'Student Name'],
      ['email', 'Email'],
      ['phoneNumber', 'Phone Number'],
      ['usn', 'USN / Registration Number'],
      ['department', 'Department'],
      ['collegeName', 'College Name'],
      ['projectTitle', 'Project Title'],
      ['projectDescription', 'Project Description'],
      ['technologiesUsed', 'Technologies Used'],
      ['githubUrl', 'GitHub Repository'],
      ['createdAt', 'Submitted At'],
    ]
    const csvRows = [
      columns.map(([, heading]) => csvCell(heading)).join(','),
      ...registrations.map((registration) =>
        columns.map(([field]) => csvCell(registration[field])).join(','),
      ),
    ]

    response
      .status(200)
      .set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="nirmaan-registrations.csv"',
        'Cache-Control': 'no-store',
      })
      .send(`\uFEFF${csvRows.join('\r\n')}\r\n`)
  } catch (error) {
    return next(error)
  }
})

router.get('/', async (request, response, next) => {
  const filters = getFilters(request.query)
  if (filters.error) {
    return response.status(400).json({ message: filters.error })
  }

  const page = parsePositiveInteger(request.query.page, 1, 100000)
  const limit = parsePositiveInteger(request.query.limit, 20, 100)
  if (page === null || limit === null) {
    return response.status(400).json({
      message: 'Page must be 1–100000 and limit must be 1–100.',
    })
  }

  const offset = (page - 1) * limit

  try {
    const [[count]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM student_registrations ${filters.where}`,
      filters.parameters,
    )
    const [registrations] = await pool.execute(
      `${registrationSelect} ${filters.where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...filters.parameters, limit, offset],
    )
    const total = Number(count.total)

    return response.json({
      registrations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    return next(error)
  }
})

router.get('/:registrationId', async (request, response, next) => {
  const registrationId = request.params.registrationId.trim()
  if (!registrationId || registrationId.length > 32) {
    return response.status(404).json({ message: 'Registration not found.' })
  }

  try {
    const [registrations] = await pool.execute(
      `${registrationSelect} WHERE registration_id = ? LIMIT 1`,
      [registrationId],
    )

    if (registrations.length === 0) {
      return response.status(404).json({ message: 'Registration not found.' })
    }

    return response.json({ registration: registrations[0] })
  } catch (error) {
    return next(error)
  }
})

export default router
export { csvCell, validateRegistration }
