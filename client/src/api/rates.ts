import { apiFetch } from './client'

export interface FXRate {
  marketRate: string
  platformRate: string
  spread: number
  fetchedAt: string
}

export interface LockedRate {
  lockId: string
  userId: string
  platformRate: string
  amountUsdc: string
  amountNgn: string
  expiresAt: string
}

export const getRates = () => apiFetch<FXRate>('/rates')

export const lockRate = (amountUsdc: string) =>
  apiFetch<LockedRate>('/rates/lock', {
    method: 'POST',
    body: JSON.stringify({ amountUsdc }),
  })
