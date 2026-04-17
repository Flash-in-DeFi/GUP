import { jwtDecode } from 'jwt-decode'

export interface JwtPayload {
  userId: string
  email: string
  role?: 'admin' | 'user'
  exp: number
}

export interface AuthUser {
  userId: string
  email: string
  role: 'admin' | 'user'
  token: string
}

export function getStoredAuth(): AuthUser | null {
  const token = localStorage.getItem('token')
  if (!token) return null
  try {
    const payload = jwtDecode<JwtPayload>(token)
    if (payload.exp * 1000 < Date.now()) {
      clearAuth()
      return null
    }
    return { userId: payload.userId, email: payload.email, role: payload.role ?? 'user', token }
  } catch {
    clearAuth()
    return null
  }
}

export function storeAuth(token: string): AuthUser | null {
  try {
    const payload = jwtDecode<JwtPayload>(token)
    localStorage.setItem('token', token)
    return { userId: payload.userId, email: payload.email, role: payload.role ?? 'user', token }
  } catch {
    return null
  }
}

export function clearAuth() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}
