import { apiFetch } from './client'

export type WithdrawalStatus = 'pending' | 'queued' | 'completed' | 'failed'

export interface WithdrawRequest {
  amountUsdc: string
  lockId: string
  bankCode: string
  accountNumber: string
  accountName: string
}

export interface WithdrawalRecord {
  id: string
  userId: string
  amountUsdc: string
  amountNgn: string
  fxRate: string
  bankCode: string
  accountNumber: string
  accountName: string
  status: WithdrawalStatus
  flutterwaveRef: string | null
  retryCount: number
  createdAt: string
  updatedAt: string
}

export const submitWithdrawal = (req: WithdrawRequest) =>
  apiFetch<WithdrawalRecord>('/withdraw', { method: 'POST', body: JSON.stringify(req) })

export const getWithdrawal = (id: string) =>
  apiFetch<WithdrawalRecord>(`/withdrawal/${id}`)
