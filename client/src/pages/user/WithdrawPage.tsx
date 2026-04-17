import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getRates, lockRate, type LockedRate } from '@/api/rates'
import { submitWithdrawal } from '@/api/withdrawals'
import { getWallet } from '@/api/wallet'
import { useCountdown } from '@/hooks/useCountdown'
import { calcNgnEstimate, formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ApiError } from '@/api/client'

export default function WithdrawPage() {
  const navigate = useNavigate()
  const [amount, setAmount] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [lockedRate, setLockedRate] = useState<LockedRate | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const countdown = useCountdown(lockedRate?.expiresAt ?? null)
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: getWallet })
  const rates = useQuery({ queryKey: ['rates'], queryFn: getRates, refetchInterval: 60000 })

  const balance = parseFloat(wallet.data?.balance ?? '0')
  const amountNum = parseFloat(amount) || 0
  const platformRate = parseFloat(rates.data?.platformRate ?? '0')
  const ngnEstimate = platformRate > 0 ? calcNgnEstimate(amountNum, platformRate) : 0

  const lockMutation = useMutation({
    mutationFn: () => lockRate(amount),
    onSuccess: (data) => {
      setLockedRate(data)
      setModalOpen(true)
    },
    onError: (err: ApiError) => setErrors({ api: err.message }),
  })

  const submitMutation = useMutation({
    mutationFn: () => submitWithdrawal({
      amountUsdc: amount,
      lockId: lockedRate!.lockId,
      bankCode,
      accountNumber,
      accountName,
    }),
    onSuccess: (data) => navigate(`/withdrawal/${data.id}`),
    onError: (err: ApiError) => {
      setModalOpen(false)
      if (err.status === 403) setErrors({ api: 'KYC approval required to withdraw.' })
      else if (err.status === 422) setErrors({ api: err.message })
      else setErrors({ api: err.message })
    },
  })

  // Close modal when countdown expires
  if (modalOpen && countdown === 0) {
    setModalOpen(false)
    setLockedRate(null)
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!amount || amountNum <= 0) e.amount = 'Enter a valid amount'
    if (amountNum > balance) e.amount = 'Insufficient balance'
    if (!bankCode) e.bankCode = 'Bank code is required'
    if (!/^\d{10}$/.test(accountNumber)) e.accountNumber = 'Account number must be exactly 10 digits'
    if (!accountName) e.accountName = 'Account name is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleLock(ev: React.FormEvent) {
    ev.preventDefault()
    if (validate()) lockMutation.mutate()
  }

  const canSubmit = amountNum > 0 && amountNum <= balance && /^\d{10}$/.test(accountNumber) && bankCode && accountName

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <h1 className="text-2xl font-bold">Withdraw</h1>

      {rates.data && (
        <p className="text-sm text-gray-500">
          Current rate: <span className="font-semibold text-gray-800">1 USDC = {formatCurrency(rates.data.platformRate, 'NGN')}</span>
        </p>
      )}

      <Card>
        <CardHeader><CardTitle>Withdrawal Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleLock} className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">USDC Amount</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
              {amountNum > 0 && platformRate > 0 && (
                <p className="text-sm text-green-600 mt-1">≈ {formatCurrency(ngnEstimate, 'NGN')}</p>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Bank Code</label>
              <Input placeholder="e.g. 058" value={bankCode} onChange={e => setBankCode(e.target.value)} />
              {errors.bankCode && <p className="text-red-500 text-xs mt-1">{errors.bankCode}</p>}
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Account Number</label>
              <Input placeholder="10-digit account number" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} maxLength={10} />
              {errors.accountNumber && <p className="text-red-500 text-xs mt-1">{errors.accountNumber}</p>}
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Account Name</label>
              <Input placeholder="Account holder name" value={accountName} onChange={e => setAccountName(e.target.value)} />
              {errors.accountName && <p className="text-red-500 text-xs mt-1">{errors.accountName}</p>}
            </div>

            {errors.api && <p className="text-red-500 text-sm">{errors.api}</p>}

            <Button type="submit" disabled={!canSubmit} loading={lockMutation.isPending}>
              Lock Rate & Preview
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Withdrawal</DialogTitle>
          </DialogHeader>
          {lockedRate && (
            <div className="flex flex-col gap-4 mt-2">
              <div className="bg-gray-50 rounded-lg p-4 flex flex-col gap-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">USDC Amount</span><span className="font-semibold">{lockedRate.amountUsdc} USDC</span></div>
                <div className="flex justify-between"><span className="text-gray-500">NGN Payout</span><span className="font-semibold text-green-600">{formatCurrency(lockedRate.amountNgn, 'NGN')}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Rate</span><span>{lockedRate.platformRate}</span></div>
              </div>
              <div className={`text-center text-sm font-semibold ${countdown <= 10 ? 'text-red-500' : 'text-gray-600'}`}>
                Rate expires in {countdown}s
              </div>
              <Button onClick={() => submitMutation.mutate()} loading={submitMutation.isPending} disabled={countdown === 0}>
                Confirm Withdrawal
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
