export interface ApiError {
  status: number
  message: string
}

const BASE = '/api'

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...init, headers })

  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.dispatchEvent(new Event('auth:logout'))
    const err: ApiError = { status: 401, message: 'Unauthorized' }
    throw err
  }

  if (!res.ok) {
    let message = 'Something went wrong. Please try again.'
    try {
      const body = await res.json()
      message = body.message || body.error || message
    } catch { /* ignore parse errors, use default message */ }
    const err: ApiError = { status: res.status, message }
    throw err
  }

  return res.json() as Promise<T>
}
