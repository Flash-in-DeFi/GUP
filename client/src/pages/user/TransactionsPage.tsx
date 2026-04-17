import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getTransactions } from '@/api/transactions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'

export default function TransactionsPage() {
  const [page, setPage] = useState(1)
  const LIMIT = 20

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['transactions', page, LIMIT],
    queryFn: () => getTransactions(page, LIMIT),
  })

  const totalPages = data?.pagination.totalPages ?? 1

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Transaction History</h1>
      <Card>
        <CardHeader><CardTitle>All Transactions</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : isError ? (
            <div className="flex items-center gap-3">
              <p className="text-red-500 text-sm">Failed to load transactions.</p>
              <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : data!.data.length === 0 ? (
            <p className="text-gray-400 text-sm">No transactions yet.</p>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Amount</th>
                    <th className="pb-2">Asset</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.data.map(tx => (
                    <tr key={tx.id} className="border-b last:border-0">
                      <td className="py-2 capitalize">{tx.type}</td>
                      <td className="py-2">{tx.amount}</td>
                      <td className="py-2">{tx.asset}</td>
                      <td className="py-2">
                        <Badge variant={tx.status === 'completed' ? 'success' : tx.status === 'failed' ? 'destructive' : 'secondary'}>
                          {tx.status}
                        </Badge>
                      </td>
                      <td className="py-2 text-gray-500">{formatDate(tx.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
