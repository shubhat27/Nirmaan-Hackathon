import assert from 'node:assert/strict'
import { test } from 'node:test'
import { csvCell, validateRegistration } from './registrations.js'

const validRegistration = {
  studentName: 'Ananya Sharma',
  email: 'ANANYA@example.edu',
  phoneNumber: '+91 98765 43210',
  usn: '1ab23cs001',
  department: 'Computer Science',
  collegeName: 'Nirmaan College',
  projectTitle: 'Campus Helper',
  projectDescription: 'A project to help students find campus services.',
  technologiesUsed: 'React, Node.js, MySQL',
  githubUrl: '',
}

test('normalizes registration values and accepts an empty optional GitHub URL', () => {
  const { values, errors } = validateRegistration(validRegistration)

  assert.deepEqual(errors, {})
  assert.equal(values.email, 'ananya@example.edu')
  assert.equal(values.usn, '1AB23CS001')
  assert.equal(values.githubUrl, null)
})

test('rejects invalid email, phone number, and non-GitHub repository links', () => {
  const { errors } = validateRegistration({
    ...validRegistration,
    email: 'not-an-email',
    phoneNumber: 'abc',
    githubUrl: 'https://example.com/user/project',
  })

  assert.equal(errors.email, 'Enter a valid email address.')
  assert.equal(
    errors.phoneNumber,
    'Enter a valid phone number with 7 to 15 digits.',
  )
  assert.equal(errors.githubUrl, 'Use a secure GitHub repository link.')
})

test('rejects missing registration fields and non-object request bodies', () => {
  const missingFields = validateRegistration({})
  const invalidBody = validateRegistration([])

  assert.ok(missingFields.errors.studentName)
  assert.ok(missingFields.errors.projectDescription)
  assert.equal(
    invalidBody.errors.form,
    'Request body must be a JSON object.',
  )
})

test('escapes CSV fields and neutralizes spreadsheet formulas', () => {
  assert.equal(csvCell('Campus, Helper'), '"Campus, Helper"')
  assert.equal(csvCell('Student "One"'), '"Student ""One"""')
  assert.equal(
    csvCell('=HYPERLINK("https://example.com")'),
    '"\'=HYPERLINK(""https://example.com"")"',
  )
})
