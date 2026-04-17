import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAdminUsers, updateKycStatus, type AdminUser } from '@/api/admin'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'
import type { ApiError } from '@/api/client'

type KycFilter = 'all' | 'pending' | 'approved' | 'rejected'

export default function AdminUsersPage() {
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<KycFilter>('all')
  const qc = useQueryClient()
  const { addToast } = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, filter],
    queryFn: () => getAdminUsers(page, filter),
  })

  const kycMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'approved' | 'rejected' }) =>
      updateKycStatus(userId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (err: ApiError) => addToast(err.message, 'error'),
  })

  const totalPages = data?.pagination.totalPages ?? 1
  const filters: KycFilter[] = ['all', 'pending', 'approved', 'rejected']

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Users</h1>

      <div className="flex gap-2">
        {filters.map(f => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => { setFilter(f); setPage(1) }} className="capitalize">
            {f}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>User List</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2">Email</th>
                    <th className="pb-2">KYC</th>
                    <th className="pb-2">Daily Limit</th>
                    <th className="pb-2">Joined</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.data ?? []).map((user: AdminUser) => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="py-2">{user.email}</td>
                      <td className="py-2">
                        <KycBadge status={user.kycStatus} />
                      </td>
                      <td className="py-2">{user.dailyLimitUsdc} USDC</td>
                      <td className="py-2 text-gray-500">{formatDate(user.createdAt)}</td>
                      <td className="py-2">
                        {user.kycStatus === 'pending' && (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => kycMutation.mutate({ userId: user.id, status: 'approved' })}
                              loading={kycMutation.isPending}>Approve</Button>
                            <Button size="sm" variant="destructive" onClick={() => kycMutation.mutate({ userId: user.id, status: 'rejected' })}
                              loading={kycMutation.isPending}>Reject</Button>
                          </div>
                        )}
                      </td>
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

function KycBadge({ status }: { status: AdminUser['kycStatus'] }) {
  const variant = status === 'approved' ? 'success' : status === 'rejected' ? 'destructive' : 'warning'
  return <Badge variant={variant} className="capitalize">{status}</Badge>
}
