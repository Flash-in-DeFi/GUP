import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { UserLayout } from '@/components/UserLayout'
import { AdminLayout } from '@/components/AdminLayout'
import { getStoredAuth } from '@/hooks/useAuth'
import NotFound from '@/pages/NotFound'

// Lazy imports
import { lazy, Suspense } from 'react'

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const SignupPage = lazy(() => import('@/pages/auth/SignupPage'))
const DashboardPage = lazy(() => import('@/pages/user/DashboardPage'))
const WithdrawPage = lazy(() => import('@/pages/user/WithdrawPage'))
const TransactionsPage = lazy(() => import('@/pages/user/TransactionsPage'))
const WithdrawalStatusPage = lazy(() => import('@/pages/user/WithdrawalStatusPage'))
const AdminOverviewPage = lazy(() => import('@/pages/admin/AdminOverviewPage'))
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'))
const AdminRecoveryPage = lazy(() => import('@/pages/admin/AdminRecoveryPage'))
const AdminWithdrawalsPage = lazy(() => import('@/pages/admin/AdminWithdrawalsPage'))

function RootRedirect() {
  const auth = getStoredAuth()
  if (!auth) return <Navigate to="/login" replace />
  if (auth.role === 'admin') return <Navigate to="/admin" replace />
  return <Navigate to="/dashboard" replace />
}

const wrap = (el: React.ReactNode) => <Suspense fallback={<div className="p-8 text-gray-400">Loading…</div>}>{el}</Suspense>

export const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
  { path: '/login', element: wrap(<LoginPage />) },
  { path: '/signup', element: wrap(<SignupPage />) },
  {
    element: <ProtectedRoute><UserLayout /></ProtectedRoute>,
    children: [
      { path: '/dashboard', element: wrap(<DashboardPage />) },
      { path: '/withdraw', element: wrap(<WithdrawPage />) },
      { path: '/transactions', element: wrap(<TransactionsPage />) },
      { path: '/withdrawal/:id', element: wrap(<WithdrawalStatusPage />) },
    ],
  },
  {
    element: <ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>,
    children: [
      { path: '/admin', element: wrap(<AdminOverviewPage />) },
      { path: '/admin/users', element: wrap(<AdminUsersPage />) },
      { path: '/admin/recovery', element: wrap(<AdminRecoveryPage />) },
      { path: '/admin/withdrawals', element: wrap(<AdminWithdrawalsPage />) },
    ],
  },
  { path: '*', element: <NotFound /> },
])
