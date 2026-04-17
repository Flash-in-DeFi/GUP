import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getRecoveryQueue, assignRecovery, type RecoveryRecord } from '@/api/admin'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import type { ApiError } from '@/api/client'

export default function AdminRecoveryPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['recovery-queue'], queryFn: getRecoveryQueue })

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Manual Recovery</h1>
      <Card>
        <CardHeader><CardTitle>Unmatched Deposits</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : (data ?? []).length === 0 ? (
            <p className="text-gray-400 text-sm">No unmatched deposits.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {(data ?? []).map((rec: RecoveryRecord) => (
                <RecoveryRow key={rec.id} record={rec} onAssigned={() => qc.invalidateQueries({ queryKey: ['recovery-queue'] })} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function RecoveryRow({ record, onAssigned }: { record: RecoveryRecord; onAssigned: () => void }) {
  const [userId, setUserId] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => assignRecovery(record.id, userId),
    onSuccess: onAssigned,
    onError: (err: ApiError) => setError(err.message),
  })

  return (
    <div className="border rounded-lg p-4 flex flex-col gap-2 text-sm">
      <div className="flex justify-between text-gray-500">
        <span>TX Hash: <code className="text-xs bg-gray-100 px-1 rounded">{record.txHash}</code></span>
        <span>{formatDate(record.createdAt)}</span>
      </div>
      <div className="flex gap-4">
        <span>Amount: <strong>{record.amount} USDC</strong></span>
        {record.memo && <span>Memo: <code className="text-xs bg-gray-100 px-1 rounded">{record.memo}</code></span>}
      </div>
      <div className="flex gap-2 items-center mt-1">
        <Input placeholder="User ID to assign" value={userId} onChange={e => setUserId(e.target.value)} className="max-w-xs" />
        <Button size="sm" disabled={!userId} loading={mutation.isPending} onClick={() => mutation.mutate()}>Assign</Button>
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  )
}
