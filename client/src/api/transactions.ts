import { apiFetch } from './client'

export interface TransactionRecord {
  id: string
  type: 'deposit' | 'withdrawal' | 'refund'
  amount: string
  asset: string
  status: string
  txHash: string | null
  createdAt: string
}

export interface PaginatedTransactions {
  data: TransactionRecord[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export const getTransactions = (page = 1, limit = 20) =>
  apiFetch<PaginatedTransactions>(`/transactions?page=${page}&limit=${limit}`)
