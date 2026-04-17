import { apiFetch } from './client'

export interface WalletBalance { asset: string; balance: string }
export interface DepositAddress { stellarAddress: string; memoId: string }

export const getWallet = () => apiFetch<WalletBalance>('/wallet')
export const getDepositAddress = () => apiFetch<DepositAddress>('/deposit-address')
