import { Link, useNavigate, Outlet } from 'react-router-dom'
import { clearAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

export function AdminLayout() {
  const navigate = useNavigate()

  function logout() {
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-56 bg-white border-r flex flex-col p-4 gap-1">
        <span className="font-bold text-blue-600 text-lg mb-4">Admin</span>
        <Link to="/admin" className="text-sm px-3 py-2 rounded hover:bg-gray-100">Overview</Link>
        <Link to="/admin/users" className="text-sm px-3 py-2 rounded hover:bg-gray-100">Users</Link>
        <Link to="/admin/recovery" className="text-sm px-3 py-2 rounded hover:bg-gray-100">Recovery</Link>
        <Link to="/admin/withdrawals" className="text-sm px-3 py-2 rounded hover:bg-gray-100">Withdrawals</Link>
        <div className="mt-auto">
          <Button variant="ghost" size="sm" className="w-full" onClick={logout}>Log out</Button>
        </div>
      </aside>
      <main className="flex-1 px-8 py-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
