import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { login } from '@/api/auth'
import { storeAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ApiError } from '@/api/client'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string; api?: string }>({})

  const mutation = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: (data) => {
      storeAuth(data.token)
      navigate('/dashboard')
    },
    onError: (err: ApiError) => {
      if (err.status === 401) setErrors({ api: 'Invalid email or password' })
      else setErrors({ api: err.message })
    },
  })

  function validate() {
    const e: typeof errors = {}
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email'
    if (password.length < 8) e.password = 'Password must be at least 8 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (validate()) mutation.mutate()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-lg border p-8 shadow-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Log in</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>
          <div>
            <Input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>
          {errors.api && <p className="text-red-500 text-sm text-center">{errors.api}</p>}
          <Button type="submit" loading={mutation.isPending}>Log in</Button>
        </form>
        <p className="text-sm text-center mt-4 text-gray-500">
          No account? <Link to="/signup" className="text-blue-600 hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
