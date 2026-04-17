import { Link, useNavigate, Outlet } from 'react-router-dom'
import { clearAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

export function UserLayout() {
  const navigate = useNavigate()

  function logout() {
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-blue-600 text-lg">OfframpNG</span>
          <Link to="/dashboard" className="text-sm text-gray-600 hover:text-blue-600">Dashboard</Link>
          <Link to="/withdraw" className="text-sm text-gray-600 hover:text-blue-600">Withdraw</Link>
          <Link to="/transactions" className="text-sm text-gray-600 hover:text-blue-600">History</Link>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}>Log out</Button>
      </nav>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
