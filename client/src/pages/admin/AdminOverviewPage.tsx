import { useQuery } from '@tanstack/react-query'
import { getAdminOverview } from '@/api/admin'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'

export default function AdminOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: getAdminOverview,
    refetchInterval: 30000,
  })

  const liquidityVariant = data?.liquidityStatus === 'healthy' ? 'success'
    : data?.liquidityStatus === 'low' ? 'warning' : 'destructive'

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Overview</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Users" value={isLoading ? null : String(data!.totalUsers)} />
        <MetricCard title="USDC Volume" value={isLoading ? null : formatCurrency(data!.totalVolumeUsdc, 'USD')} />
        <MetricCard title="NGN Volume" value={isLoading ? null : formatCurrency(data!.totalVolumeNgn, 'NGN')} />
        <Card>
          <CardHeader><CardTitle className="text-sm text-gray-500">Liquidity</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-6 w-20" /> : (
              <Badge variant={liquidityVariant} className="capitalize">{data!.liquidityStatus}</Badge>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({ title, value }: { title: string; value: string | null }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm text-gray-500">{title}</CardTitle></CardHeader>
      <CardContent>
        {value === null ? <Skeleton className="h-6 w-24" /> : <p className="text-2xl font-bold">{value}</p>}
      </CardContent>
    </Card>
  )
}
