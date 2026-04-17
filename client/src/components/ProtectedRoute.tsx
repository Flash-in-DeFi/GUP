import { Navigate } from 'react-router-dom'
import { getStoredAuth } from '@/hooks/useAuth'

interface Props {
  children: React.ReactNode
  role?: 'admin' | 'user'
}

export function ProtectedRoute({ children, role }: Props) {
  const auth = getStoredAuth()
  if (!auth) return <Navigate to="/login" replace />
  if (role && auth.role !== role) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
