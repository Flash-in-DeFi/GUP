import { apiFetch } from './client'

export interface SignupResult {
  userId: string
  email: string
  memoId: string
  stellarAddress: string
}

export interface LoginResult {
  token: string
  userId: string
  email: string
}

export const signup = (email: string, password: string) =>
  apiFetch<SignupResult>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

export const login = (email: string, password: string) =>
  apiFetch<LoginResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
