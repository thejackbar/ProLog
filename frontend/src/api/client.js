const BASE = '/api'

async function request(method, path, body) {
  const opts = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)

  const res = await fetch(BASE + path, opts)

  if (res.status === 401) {
    // Clear any stale auth state and redirect
    window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    const err = new Error('Unauthorized')
    err.status = 401
    throw err
  }

  if (res.status === 204) return null

  const data = await res.json().catch(() => ({ detail: 'Request failed' }))

  if (!res.ok) {
    throw new Error(data.detail || 'Request failed')
  }

  return data
}

export const api = {
  auth: {
    login: (data) => request('POST', '/auth/login', data),
    register: (data) => request('POST', '/auth/register', data),
    logout: () => request('POST', '/auth/logout'),
    me: () => request('GET', '/auth/me'),
  },
  cases: {
    list: (params = {}) =>
      request('GET', '/cases?' + new URLSearchParams(params)),
    get: (id) => request('GET', '/cases/' + id),
    create: (data) => request('POST', '/cases', data),
    update: (id, data) => request('PUT', '/cases/' + id, data),
    delete: (id) => request('DELETE', '/cases/' + id),
    bulkDelete: (ids) => request('POST', '/cases/bulk-delete', { ids }),
  },
  users: {
    profile: () => request('GET', '/users/profile'),
    updateProfile: (data) => request('PUT', '/users/profile', data),
    changePassword: (data) => request('POST', '/users/change-password', data),
    qualifications: () => request('GET', '/users/qualifications'),
    addQualification: (data) => request('POST', '/users/qualifications', data),
    deleteQualification: (id) =>
      request('DELETE', '/users/qualifications/' + id),
    hospitals: () => request('GET', '/users/hospitals'),
    addHospital: (name) => request('POST', '/users/hospitals', { name }),
  },
  ai: {
    analyze: (data) => request('POST', '/ai/analyze', data),
  },
  export: {
    csv: () => {
      window.location.href = '/api/export/csv'
    },
    excel: () => {
      window.location.href = '/api/export/excel'
    },
  },
}
