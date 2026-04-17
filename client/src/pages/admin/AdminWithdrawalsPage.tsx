import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAdminWithdrawals } from '@/api/admin'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { WithdrawalStatus } from '@/api/withdrawals'

type StatusFilter = 'all' | WithdrawalStatus

const STATUS_VARIANT: Record<WithdrawalStatus, 'warning' | 'secondary' | 'success' | 'destructive'> = {
  pending: 'warning',
  queued: 'secondary',
  completed: 'success',
  failed: 'destructive',
}

export default function AdminWithdrawalsPage() {
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<StatusFilter>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-withdrawals', page, filter],
    queryFn: () => getAdminWithdrawals(page, filter),
  })

  const totalPages = data?.pagination.totalPages ?? 1
  const filters: StatusFilter[] = ['all', 'pending', 'queued', 'completed', 'failed']

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Withdrawals</h1>

      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'}
            onClick={() => { setFilter(f); setPage(1) }} className="capitalize">
            {f}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Withdrawal List</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (data?.data ?? []).length === 0 ? (
            <p className="text-gray-400 text-sm">No withdrawals found.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="pb-2">User</th>
                      <th className="pb-2">USDC</th>
                      <th className="pb-2">NGN</th>
                      <th className="pb-2">Rate</th>
                      <th className="pb-2">Account</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.data.map(w => (
                      <tr key={w.id} className="border-b last:border-0">
                        <td className="py-2 text-xs text-gray-500 truncate max-w-[120px]">{w.userId}</td>
                        <td className="py-2">{w.amountUsdc}</td>
                        <td className="py-2">{formatCurrency(w.amountNgn, 'NGN')}</td>
                        <td className="py-2">{w.fxRate}</td>
                        <td className="py-2">{w.accountNumber}</td>
                        <td className="py-2">
                          <Badge variant={STATUS_VARIANT[w.status]} className="capitalize">{w.status}</Badge>
                        </td>
                        <td className="py-2 text-gray-500">{formatDate(w.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between mt-4">
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
