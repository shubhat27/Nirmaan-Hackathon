import { useRef, useState } from 'react'
import AdminDashboard from './AdminDashboard.jsx'
import { apiBaseUrl } from './api.js'
import './App.css'

const initialForm = {
  studentName: '',
  email: '',
  phoneNumber: '',
  usn: '',
  department: '',
  collegeName: '',
  projectTitle: '',
  projectDescription: '',
  technologiesUsed: '',
  githubUrl: '',
}

function validateForm(form) {
  const errors = {}
  const requiredFields = [
    ['studentName', 'Enter your name.'],
    ['email', 'Enter your email address.'],
    ['phoneNumber', 'Enter your phone number.'],
    ['usn', 'Enter your USN or registration number.'],
    ['department', 'Enter your department.'],
    ['collegeName', 'Enter your college name.'],
    ['projectTitle', 'Enter your project title.'],
    ['projectDescription', 'Describe your project.'],
    ['technologiesUsed', 'List the technologies used.'],
  ]

  for (const [field, message] of requiredFields) {
    if (!form[field].trim()) {
      errors[field] = message
    }
  }

  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }

  const phone = form.phoneNumber.trim()
  const phoneDigits = phone.replace(/\D/g, '')
  if (
    phone &&
    (!/^\+?[\d\s().-]+$/.test(phone) ||
      phoneDigits.length < 7 ||
      phoneDigits.length > 15)
  ) {
    errors.phoneNumber = 'Enter a valid phone number with 7 to 15 digits.'
  }

  const githubUrl = form.githubUrl.trim()
  if (githubUrl) {
    try {
      const url = new URL(githubUrl)
      const isGithubRepository =
        url.protocol === 'https:' &&
        ['github.com', 'www.github.com'].includes(url.hostname) &&
        url.pathname.split('/').filter(Boolean).length >= 2

      if (!isGithubRepository) {
        errors.githubUrl = 'Use a secure GitHub repository link.'
      }
    } catch {
      errors.githubUrl = 'Enter a valid GitHub repository URL.'
    }
  }

  return errors
}

function FormField({ id, label, error, hint, className = '', children }) {
  return (
    <div
      className={`form-field${className ? ` ${className}` : ''}${error ? ' has-error' : ''}`}
    >
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && (
        <span className="field-hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
      {error && (
        <span className="field-error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </div>
  )
}

function StudentRegistration() {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submissionLock = useRef(false)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
    setErrors((currentErrors) => {
      if (!currentErrors[name]) return currentErrors
      const nextErrors = { ...currentErrors }
      delete nextErrors[name]
      return nextErrors
    })
    if (status) setStatus(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submissionLock.current) return

    const validationErrors = validateForm(form)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      setStatus({
        type: 'error',
        text: 'Please review the highlighted fields before submitting.',
      })
      document.getElementById(Object.keys(validationErrors)[0])?.focus()
      return
    }

    submissionLock.current = true
    setIsSubmitting(true)
    setStatus(null)

    try {
      const response = await fetch(`${apiBaseUrl}/api/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      let result
      try {
        result = await response.json()
      } catch {
        throw new Error('The server returned an unreadable response. Please try again.')
      }

      if (!result || typeof result !== 'object' || Array.isArray(result)) {
        throw new Error('The server returned an invalid response. Please try again.')
      }

      if (!response.ok) {
        const message =
          typeof result.message === 'string' && result.message.trim()
            ? result.message
            : 'Registration failed. Please try again.'
        throw new Error(message)
      }

      if (
        typeof result.registrationId !== 'string' ||
        !result.registrationId.trim()
      ) {
        throw new Error(
          'The server did not return a registration ID. Please contact the organizers before submitting again.',
        )
      }

      setStatus({
        type: 'success',
        text: `Registration submitted. Your registration ID is ${result.registrationId}.`,
      })
      setForm(initialForm)
    } catch (error) {
      const message =
        error instanceof TypeError
          ? 'Could not connect to the registration service. Please try again when the service is available.'
          : error instanceof Error
            ? error.message
            : 'An unexpected error occurred. Please try again.'
      setStatus({ type: 'error', text: message })
    } finally {
      submissionLock.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Nirmaan home">
          <span className="brand-mark" aria-hidden="true">
            N
          </span>
          <span className="brand-name">
            NIRMAAN<span>ORGANIZATION</span>
          </span>
        </a>
        <div className="topbar-actions">
          <span className="topbar-note">AI Project Execution Hackathon</span>
          <a className="admin-link" href="/admin">
            Admin portal
          </a>
        </div>
      </header>

      <main id="top" className="registration-layout">
        <section className="intro-panel" aria-labelledby="page-title">
          <p className="eyebrow">
            <span className="eyebrow-dot" aria-hidden="true" />
            STUDENT REGISTRATION · 2026
          </p>
          <h1 id="page-title">
            Ideas become
            <br />
            <span>real here.</span>
          </h1>
          <p className="intro-copy">
            Bring your boldest project idea. Tell us what you’re building, how
            you’re building it, and the team behind it.
          </p>

          <div className="event-card">
            <div className="event-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3.5v4m0 9v4m8.5-8.5h-4m-9 0h-4m15-6-2.8 2.8m-9.4 9.4-2.8 2.8m17 0-2.8-2.8m-9.4-9.4L5.5 5.5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
              </svg>
            </div>
            <div>
              <strong>Build for impact</strong>
              <p>One project. A team of problem-solvers. A chance to make it real.</p>
            </div>
          </div>

          <div className="privacy-note">
            <span className="privacy-icon" aria-hidden="true">✓</span>
            <p>Your details are used only for hackathon registration.</p>
          </div>
        </section>

        <section className="form-panel" aria-labelledby="form-title">
          <div className="form-heading">
            <div>
              <p className="form-kicker">LET’S GET YOU REGISTERED</p>
              <h2 id="form-title">Student details</h2>
            </div>
            <span className="required-note">
              <span aria-hidden="true">*</span> Required
            </span>
          </div>

          {status && (
            <div
              className={`form-status ${status.type}`}
              role={status.type === 'error' ? 'alert' : 'status'}
              aria-live="polite"
              aria-atomic="true"
            >
              <span className="status-icon" aria-hidden="true">
                {status.type === 'success' ? '✓' : '!'}
              </span>
              <span>{status.text}</span>
            </div>
          )}

          <form noValidate onSubmit={handleSubmit}>
            <div className="form-grid">
              <FormField id="studentName" label="Student name" error={errors.studentName}>
                <input
                  id="studentName"
                  name="studentName"
                  type="text"
                  autoComplete="name"
                  placeholder="e.g. Ananya Sharma"
                  maxLength={120}
                  required
                  value={form.studentName}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.studentName)}
                  aria-describedby={errors.studentName ? 'studentName-error' : undefined}
                />
              </FormField>

              <FormField id="email" label="Email address" error={errors.email}>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@college.edu"
                  maxLength={254}
                  required
                  value={form.email}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
              </FormField>

              <FormField id="phoneNumber" label="Phone number" error={errors.phoneNumber}>
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="+91 98765 43210"
                  maxLength={24}
                  required
                  value={form.phoneNumber}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.phoneNumber)}
                  aria-describedby={errors.phoneNumber ? 'phoneNumber-error' : undefined}
                />
              </FormField>

              <FormField
                id="usn"
                label="USN / registration number"
                error={errors.usn}
              >
                <input
                  id="usn"
                  name="usn"
                  type="text"
                  placeholder="e.g. 1AB23CS001"
                  maxLength={40}
                  required
                  value={form.usn}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.usn)}
                  aria-describedby={errors.usn ? 'usn-error' : undefined}
                />
              </FormField>

              <FormField id="department" label="Department" error={errors.department}>
                <input
                  id="department"
                  name="department"
                  type="text"
                  placeholder="e.g. Computer Science"
                  maxLength={100}
                  required
                  value={form.department}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.department)}
                  aria-describedby={errors.department ? 'department-error' : undefined}
                />
              </FormField>

              <FormField id="collegeName" label="College name" error={errors.collegeName}>
                <input
                  id="collegeName"
                  name="collegeName"
                  type="text"
                  placeholder="Your college or institution"
                  maxLength={180}
                  required
                  value={form.collegeName}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.collegeName)}
                  aria-describedby={errors.collegeName ? 'collegeName-error' : undefined}
                />
              </FormField>

              <FormField id="projectTitle" label="Project title" error={errors.projectTitle}>
                <input
                  id="projectTitle"
                  name="projectTitle"
                  type="text"
                  placeholder="Give your project a name"
                  maxLength={160}
                  required
                  value={form.projectTitle}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.projectTitle)}
                  aria-describedby={errors.projectTitle ? 'projectTitle-error' : undefined}
                />
              </FormField>

              <FormField
                id="githubUrl"
                label="GitHub repository"
                error={errors.githubUrl}
                hint="Optional · You can share it later."
              >
                <input
                  id="githubUrl"
                  name="githubUrl"
                  type="url"
                  placeholder="https://github.com/you/project"
                  maxLength={500}
                  value={form.githubUrl}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.githubUrl)}
                  aria-describedby={
                    errors.githubUrl ? 'githubUrl-error' : 'githubUrl-hint'
                  }
                />
              </FormField>

              <FormField
                id="projectDescription"
                label="Project description"
                error={errors.projectDescription}
                hint={`${form.projectDescription.length}/2000 characters`}
                className="full-width"
              >
                <textarea
                  id="projectDescription"
                  name="projectDescription"
                  placeholder="What problem does it solve? Who will it help?"
                  rows={4}
                  maxLength={2000}
                  required
                  value={form.projectDescription}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.projectDescription)}
                  aria-describedby={
                    errors.projectDescription
                      ? 'projectDescription-error'
                      : 'projectDescription-hint'
                  }
                />
              </FormField>

              <FormField
                id="technologiesUsed"
                label="Technologies used"
                error={errors.technologiesUsed}
                hint="Separate technologies with commas."
                className="full-width"
              >
                <input
                  id="technologiesUsed"
                  name="technologiesUsed"
                  type="text"
                  placeholder="e.g. React, Node.js, MySQL"
                  maxLength={500}
                  required
                  value={form.technologiesUsed}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.technologiesUsed)}
                  aria-describedby={
                    errors.technologiesUsed
                      ? 'technologiesUsed-error'
                      : 'technologiesUsed-hint'
                  }
                />
              </FormField>
            </div>

            <div className="form-footer">
              <p className="submit-note">
                <span aria-hidden="true">*</span> Fields marked as required must
                be completed.
              </p>
              <button className="submit-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting…' : 'Submit registration'}
                {!isSubmitting && (
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path
                      d="M4.5 10h11m-4.5-4.5L15.5 10 11 14.5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </div>
          </form>

          <p className="confirmation-note">
            Your registration is confirmed only after the service returns a
            registration ID.
          </p>
        </section>
      </main>

      <footer className="page-footer">
        <span>© 2026 Nirmaan Organization</span>
        <span>Made for builders, by builders.</span>
      </footer>
    </div>
  )
}

function App() {
  const isAdminRoute = window.location.pathname.replace(/\/+$/, '') === '/admin'
  return isAdminRoute ? <AdminDashboard /> : <StudentRegistration />
}

export default App
