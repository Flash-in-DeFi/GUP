import { apiFetch } from './client'
import type { WithdrawalRecord } from './withdrawals'

export interface AdminOverview {
  totalUsers: number
  totalVolumeUsdc: string
  totalVolumeNgn: string
  liquidityStatus: 'healthy' | 'low' | 'critical'
}

export interface AdminUser {
  id: string
  email: string
  kycStatus: 'pending' | 'approved' | 'rejected'
  dailyLimitUsdc: string
  createdAt: string
}

export interface PaginatedUsers {
  data: AdminUser[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export interface RecoveryRecord {
  id: string
  txHash: string
  amount: string
  memo: string | null
  createdAt: string
}

export interface PaginatedWithdrawals {
  data: WithdrawalRecord[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export const getAdminOverview = () => apiFetch<AdminOverview>('/admin/overview')

export const getAdminUsers = (page = 1, kycFilter = 'all') =>
  apiFetch<PaginatedUsers>(`/admin/users?page=${page}&kyc=${kycFilter}`)

export const updateKycStatus = (userId: string, status: 'approved' | 'rejected') =>
  apiFetch<void>(`/admin/users/${userId}/kyc`, { method: 'PATCH', body: JSON.stringify({ status }) })

export const getRecoveryQueue = () => apiFetch<RecoveryRecord[]>('/admin/recovery')

export const assignRecovery = (recordId: string, userId: string) =>
  apiFetch<void>(`/admin/recovery/${recordId}/assign`, { method: 'POST', body: JSON.stringify({ userId }) })

export const getAdminWithdrawals = (page = 1, statusFilter = 'all') =>
  apiFetch<PaginatedWithdrawals>(`/admin/withdrawals?page=${page}&status=${statusFilter}`)
