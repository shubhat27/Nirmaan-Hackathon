import { useCallback, useEffect, useState } from 'react'
import { apiBaseUrl } from './api.js'
import './AdminDashboard.css'

const pageSize = 20

async function readJson(response) {
  try {
    return await response.json()
  } catch {
    throw new Error('The server returned an unreadable response.')
  }
}

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date)
}

function DetailRow({ label, children }) {
  return (
    <div className="detail-row">
      <dt>{label}</dt>
      <dd>{children || '—'}</dd>
    </div>
  )
}

function AdminDashboard() {
  const [usernameInput, setUsernameInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [token, setToken] = useState('')
  const [admin, setAdmin] = useState(null)
  const [registrations, setRegistrations] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 0,
  })
  const [searchInput, setSearchInput] = useState('')
  const [departmentInput, setDepartmentInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [appliedDepartment, setAppliedDepartment] = useState('')
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedRegistration, setSelectedRegistration] = useState(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [detailError, setDetailError] = useState('')

  const signOut = useCallback((message = '') => {
    setToken('')
    setAdmin(null)
    setRegistrations([])
    setPagination({ page: 1, limit: pageSize, total: 0, totalPages: 0 })
    setPage(1)
    setError('')
    setLoginError(message)
    setDetailOpen(false)
    setSelectedRegistration(null)
  }, [])

  async function handleLogin(event) {
    event.preventDefault()
    setLoginError('')
    setIsLoggingIn(true)

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: usernameInput.trim(),
          password: passwordInput,
        }),
      })
      const result = await readJson(response)

      if (!response.ok) {
        throw new Error(result.message || 'Could not sign in.')
      }

      if (typeof result.token !== 'string' || !result.admin) {
        throw new Error('The server did not return a valid sign-in session.')
      }

      setToken(result.token)
      setAdmin(result.admin)
      setPasswordInput('')
    } catch (loginRequestError) {
      const message =
        loginRequestError instanceof TypeError
          ? 'Could not connect to the admin service. Check that the backend is running.'
          : loginRequestError instanceof Error
            ? loginRequestError.message
            : 'Could not sign in. Please try again.'
      setLoginError(message)
    } finally {
      setIsLoggingIn(false)
    }
  }

  useEffect(() => {
    if (!token) return undefined

    const controller = new AbortController()

    async function loadRegistrations() {
      setIsLoading(true)
      setError('')
      const query = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      })
      if (appliedSearch) query.set('search', appliedSearch)
      if (appliedDepartment) query.set('department', appliedDepartment)

      try {
        const response = await fetch(
          `${apiBaseUrl}/api/registrations?${query.toString()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          },
        )
        const result = await readJson(response)

        if (response.status === 401) {
          signOut('Your admin session expired. Please sign in again.')
          return
        }
        if (!response.ok) {
          throw new Error(result.message || 'Could not load registrations.')
        }

        setRegistrations(result.registrations)
        setPagination(result.pagination)
      } catch (requestError) {
        if (requestError.name !== 'AbortError') {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Could not load registrations.',
          )
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    void loadRegistrations()
    return () => controller.abort()
  }, [token, page, appliedSearch, appliedDepartment, signOut])

  useEffect(() => {
    if (!detailOpen) return undefined

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setDetailOpen(false)
        setSelectedRegistration(null)
        setDetailError('')
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [detailOpen])

  function applyFilters(event) {
    event.preventDefault()
    setPage(1)
    setAppliedSearch(searchInput.trim())
    setAppliedDepartment(departmentInput.trim())
  }

  function clearFilters() {
    setSearchInput('')
    setDepartmentInput('')
    setPage(1)
    setAppliedSearch('')
    setAppliedDepartment('')
  }

  async function viewDetails(registrationId) {
    setDetailOpen(true)
    setIsLoadingDetails(true)
    setSelectedRegistration(null)
    setDetailError('')

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/registrations/${encodeURIComponent(registrationId)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const result = await readJson(response)

      if (response.status === 401) {
        signOut('Your admin session expired. Please sign in again.')
        return
      }
      if (!response.ok) {
        throw new Error(result.message || 'Could not load registration details.')
      }

      setSelectedRegistration(result.registration)
    } catch (requestError) {
      setDetailError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not load registration details.',
      )
    } finally {
      setIsLoadingDetails(false)
    }
  }

  async function exportCsv() {
    setIsExporting(true)
    setError('')
    const query = new URLSearchParams()
    if (appliedSearch) query.set('search', appliedSearch)
    if (appliedDepartment) query.set('department', appliedDepartment)
    const queryString = query.size > 0 ? `?${query.toString()}` : ''

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/registrations/export.csv${queryString}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )

      if (response.status === 401) {
        signOut('Your admin session expired. Please sign in again.')
        return
      }
      if (!response.ok) {
        const result = await readJson(response)
        throw new Error(result.message || 'Could not export registrations.')
      }

      const downloadUrl = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = 'nirmaan-registrations.csv'
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
    } catch (exportError) {
      setError(
        exportError instanceof TypeError
          ? 'Could not connect to the registration service.'
          : exportError instanceof Error
            ? exportError.message
            : 'Could not export registrations.',
      )
    } finally {
      setIsExporting(false)
    }
  }

  if (!token) {
    return (
      <main className="admin-login-page">
        <a className="admin-back-link" href="/">
          <span aria-hidden="true">←</span> Student registration
        </a>
        <section className="admin-login-card" aria-labelledby="admin-login-title">
          <div className="admin-brand-mark" aria-hidden="true">N</div>
          <p className="admin-eyebrow">NIRMAAN ORGANIZATION</p>
          <h1 id="admin-login-title">Admin sign in</h1>
          <p className="admin-login-copy">
            Sign in with your administrator account to manage hackathon entries.
          </p>

          {loginError && (
            <div className="admin-alert" role="alert">
              {loginError}
            </div>
          )}

          <form className="admin-login-form" onSubmit={handleLogin}>
            <label htmlFor="admin-username">Username</label>
            <input
              id="admin-username"
              type="text"
              autoComplete="username"
              maxLength={100}
              required
              value={usernameInput}
              onChange={(event) => setUsernameInput(event.target.value)}
            />

            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
            />

            <button type="submit" disabled={isLoggingIn}>
              {isLoggingIn ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="admin-login-footnote">
            Your session stays in this tab and ends when you sign out or close it.
          </p>
        </section>
      </main>
    )
  }

  return (
    <div className="admin-page">
      <header className="admin-topbar">
        <a className="admin-brand" href="/" aria-label="Nirmaan home">
          <span className="admin-brand-mark" aria-hidden="true">N</span>
          <span>NIRMAAN <small>ORGANIZATION</small></span>
        </a>
        <div className="admin-account">
          <span className="admin-account-name">{admin?.username}</span>
          <button type="button" className="sign-out-button" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <main className="admin-content">
        <div className="admin-page-heading">
          <div>
            <p className="admin-eyebrow">AI PROJECT EXECUTION HACKATHON</p>
            <h1>Registrations</h1>
            <p className="admin-subtitle">
              Review student projects and manage submitted entries.
            </p>
          </div>
          <button
            type="button"
            className="export-button"
            onClick={exportCsv}
            disabled={isExporting || pagination.total === 0}
          >
            <span aria-hidden="true">↓</span>
            {isExporting ? 'Preparing CSV…' : 'Export CSV'}
          </button>
        </div>

        {error && (
          <div className="admin-alert admin-page-alert" role="alert">
            {error}
          </div>
        )}

        <section className="admin-summary-card" aria-label="Registration summary">
          <span className="summary-icon" aria-hidden="true">↗</span>
          <div>
            <span className="summary-label">Total registrations</span>
            <strong>{pagination.total.toLocaleString('en-IN')}</strong>
          </div>
          <span className="summary-caption">All student project submissions</span>
        </section>

        <section className="admin-list-card" aria-labelledby="registration-list-title">
          <div className="list-card-heading">
            <div>
              <h2 id="registration-list-title">Student entries</h2>
              <p>Search by name, USN, or college; filter by department.</p>
            </div>
            <span className="result-count">
              {pagination.total} {pagination.total === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          <form className="registration-filters" onSubmit={applyFilters}>
            <label className="search-field">
              <span className="visually-hidden">Search by name, USN, or college</span>
              <span className="search-icon" aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Search name, USN, or college"
                maxLength={100}
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </label>
            <label className="department-field">
              <span className="visually-hidden">Filter by department</span>
              <input
                type="text"
                placeholder="Department (exact match)"
                maxLength={100}
                value={departmentInput}
                onChange={(event) => setDepartmentInput(event.target.value)}
              />
            </label>
            <button type="submit" className="filter-button">Apply filters</button>
            <button type="button" className="clear-filter-button" onClick={clearFilters}>
              Clear
            </button>
          </form>

          <div className="registration-table-wrap">
            <table className="registration-table">
              <thead>
                <tr>
                  <th scope="col">Student</th>
                  <th scope="col">Project</th>
                  <th scope="col">College / department</th>
                  <th scope="col">Submitted</th>
                  <th scope="col"><span className="visually-hidden">Details</span></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="table-state" colSpan={5}>Loading registrations…</td>
                  </tr>
                ) : registrations.length === 0 ? (
                  <tr>
                    <td className="table-state" colSpan={5}>
                      {error ? 'Registrations could not be loaded.' : 'No registrations match these filters.'}
                    </td>
                  </tr>
                ) : (
                  registrations.map((registration) => (
                    <tr key={registration.registrationId}>
                      <td>
                        <strong className="student-table-name">{registration.studentName}</strong>
                        <span className="table-secondary">{registration.usn}</span>
                      </td>
                      <td>
                        <strong className="project-table-name">{registration.projectTitle}</strong>
                        <span className="table-secondary">{registration.registrationId}</span>
                      </td>
                      <td>
                        <strong className="college-table-name">{registration.collegeName}</strong>
                        <span className="table-secondary">{registration.department}</span>
                      </td>
                      <td className="date-cell">{formatDate(registration.createdAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="details-button"
                          onClick={() => viewDetails(registration.registrationId)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="pagination-bar">
            <span>
              Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
            </span>
            <div>
              <button
                type="button"
                onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                disabled={isLoading || page <= 1}
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  setPage((currentPage) =>
                    Math.min(pagination.totalPages, currentPage + 1),
                  )
                }
                disabled={isLoading || page >= pagination.totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </section>

        <p className="admin-session-note">
          Admin session is held in memory only. Refreshing this page signs you out.
        </p>
      </main>

      {detailOpen && (
        <div
          className="detail-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDetailOpen(false)
          }}
        >
          <section
            className="registration-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="registration-detail-title"
          >
            <div className="dialog-heading">
              <div>
                <p className="admin-eyebrow">REGISTRATION DETAILS</p>
                <h2 id="registration-detail-title">Student submission</h2>
              </div>
              <button
                type="button"
                className="dialog-close"
                aria-label="Close details"
                onClick={() => setDetailOpen(false)}
              >
                ×
              </button>
            </div>

            {isLoadingDetails ? (
              <p className="dialog-state">Loading registration details…</p>
            ) : detailError ? (
              <p className="dialog-state dialog-error" role="alert">{detailError}</p>
            ) : selectedRegistration ? (
              <>
                <p className="registration-id-chip">
                  {selectedRegistration.registrationId}
                </p>
                <dl className="registration-details">
                  <DetailRow label="Student">{selectedRegistration.studentName}</DetailRow>
                  <DetailRow label="Email">
                    <a href={`mailto:${selectedRegistration.email}`}>
                      {selectedRegistration.email}
                    </a>
                  </DetailRow>
                  <DetailRow label="Phone">
                    <a href={`tel:${selectedRegistration.phoneNumber}`}>
                      {selectedRegistration.phoneNumber}
                    </a>
                  </DetailRow>
                  <DetailRow label="USN">{selectedRegistration.usn}</DetailRow>
                  <DetailRow label="Department">{selectedRegistration.department}</DetailRow>
                  <DetailRow label="College">{selectedRegistration.collegeName}</DetailRow>
                  <DetailRow label="Project">{selectedRegistration.projectTitle}</DetailRow>
                  <DetailRow label="Description">
                    <span className="detail-description">
                      {selectedRegistration.projectDescription}
                    </span>
                  </DetailRow>
                  <DetailRow label="Technologies">
                    {selectedRegistration.technologiesUsed}
                  </DetailRow>
                  <DetailRow label="GitHub">
                    {selectedRegistration.githubUrl ? (
                      <a
                        href={selectedRegistration.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open repository
                      </a>
                    ) : null}
                  </DetailRow>
                  <DetailRow label="Submitted">
                    {formatDate(selectedRegistration.createdAt)}
                  </DetailRow>
                </dl>
              </>
            ) : null}
          </section>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
