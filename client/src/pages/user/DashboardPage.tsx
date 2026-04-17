import { useQuery } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { getWallet, getDepositAddress } from '@/api/wallet'
import { getTransactions } from '@/api/transactions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'

function CopyButton({ text, label }: { text: string; label: string }) {
  const { addToast } = useToast()
  function copy() {
    navigator.clipboard.writeText(text)
    addToast(`${label} copied!`, 'success')
  }
  return (
    <Button variant="outline" size="sm" onClick={copy}>Copy</Button>
  )
}

export default function DashboardPage() {
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: getWallet })
  const deposit = useQuery({ queryKey: ['deposit-address'], queryFn: getDepositAddress })
  const txns = useQuery({ queryKey: ['transactions', 1, 5], queryFn: () => getTransactions(1, 5) })

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Balance */}
      <Card>
        <CardHeader><CardTitle>USDC Balance</CardTitle></CardHeader>
        <CardContent>
          {wallet.isLoading ? (
            <Skeleton className="h-8 w-40" />
          ) : wallet.isError ? (
            <div className="flex items-center gap-3">
              <p className="text-red-500 text-sm">Failed to load balance.</p>
              <Button size="sm" variant="outline" onClick={() => wallet.refetch()}>Retry</Button>
            </div>
          ) : (
            <p className="text-3xl font-bold text-blue-600">
              {formatCurrency(wallet.data!.balance, 'USD')} USDC
            </p>
          )}
        </CardContent>
      </Card>

      {/* Deposit Address */}
      <Card>
        <CardHeader><CardTitle>Deposit Address</CardTitle></CardHeader>
        <CardContent>
          {deposit.isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-32 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
          ) : deposit.isError ? (
            <p className="text-red-500 text-sm">Failed to load deposit address.</p>
          ) : (
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <QRCodeSVG value={`${deposit.data!.stellarAddress}?memo=${deposit.data!.memoId}`} size={128} />
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Stellar Address</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded break-all">{deposit.data!.stellarAddress}</code>
                    <CopyButton text={deposit.data!.stellarAddress} label="Address" />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Memo ID (required)</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{deposit.data!.memoId}</code>
                    <CopyButton text={deposit.data!.memoId} label="Memo ID" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader><CardTitle>Recent Transactions</CardTitle></CardHeader>
        <CardContent>
          {txns.isLoading ? (
            <div className="flex flex-col gap-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : txns.isError ? (
            <p className="text-red-500 text-sm">Failed to load transactions.</p>
          ) : txns.data!.data.length === 0 ? (
            <p className="text-gray-400 text-sm">No transactions yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {txns.data!.data.map(tx => (
                  <tr key={tx.id} className="border-b last:border-0">
                    <td className="py-2 capitalize">{tx.type}</td>
                    <td className="py-2">{tx.amount} {tx.asset}</td>
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
