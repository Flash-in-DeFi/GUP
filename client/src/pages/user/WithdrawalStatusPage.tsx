import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getWithdrawal, type WithdrawalStatus } from '@/api/withdrawals'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/utils'

const STATUS_LABELS: Record<WithdrawalStatus, string> = {
  pending: 'Pending',
  queued: 'Queued',
  completed: 'Completed',
  failed: 'Failed',
}

const STATUS_VARIANT: Record<WithdrawalStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'warning'> = {
  pending: 'warning',
  queued: 'secondary',
  completed: 'success',
  failed: 'destructive',
}

export default function WithdrawalStatusPage() {
  const { id } = useParams<{ id: string }>()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['withdrawal', id],
    queryFn: () => getWithdrawal(id!),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'completed' || status === 'failed') return false
      return 10000
    },
  })

  if (isLoading) return (
    <div className="flex flex-col gap-4 max-w-lg">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
    </div>
  )

  if (isError) {
    const apiErr = error as { status?: number }
    return (
      <div className="max-w-lg">
        <p className="text-red-500">{apiErr?.status === 404 ? 'Withdrawal not found.' : 'Failed to load withdrawal.'}</p>
      </div>
    )
  }

  const w = data!

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <h1 className="text-2xl font-bold">Withdrawal Status</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Status</CardTitle>
            <Badge variant={STATUS_VARIANT[w.status]}>{STATUS_LABELS[w.status]}</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <Row label="USDC Amount" value={`${w.amountUsdc} USDC`} />
          <Row label="NGN Payout" value={formatCurrency(w.amountNgn, 'NGN')} />
          <Row label="FX Rate" value={w.fxRate} />
          <Row label="Bank Code" value={w.bankCode} />
          <Row label="Account Number" value={w.accountNumber} />
          <Row label="Account Name" value={w.accountName} />
          <Row label="Created" value={formatDate(w.createdAt)} />
          {w.flutterwaveRef && <Row label="Reference" value={w.flutterwaveRef} />}

          {w.status === 'failed' && (
            <div className="mt-2 rounded-md bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
              This withdrawal failed. Your USDC has been returned to your wallet.
            </div>
          )}
          {(w.status === 'pending' || w.status === 'queued') && (
            <p className="text-gray-400 text-xs mt-1">Refreshing every 10 seconds…</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
