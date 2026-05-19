import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import AuthForm from '../components/AuthForm'
import TelegramVerify from '../components/TelegramVerify'
import { loginUser, type User } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { ClipboardList } from 'lucide-react'
import type { TelegramUser } from '../components/TelegramVerify'

interface LoginFormData {
  email: string
  password: string
}

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null)

  const handleTelegramAuth = (user: TelegramUser) => {
    setTelegramUser(user)
    toast.success(`Verified as @${user.username || user.first_name}`)
  }

  const onSubmit = async (data: LoginFormData | { fullName: string; email: string; password: string; confirmPassword: string }) => {
    const loginData = data as LoginFormData;
    setIsLoading(true)
    try {
      const response = await loginUser({
        email: loginData.email,
        password: loginData.password,
      })
      login(response.token, response.user as User)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (error: unknown) {
      let message = 'Invalid email or password'
      if (
        error instanceof Object &&
        error !== null &&
        'response' in error &&
        typeof error.response === 'object' &&
        error.response !== null &&
        'data' in error.response &&
        typeof error.response.data === 'object' &&
        error.response.data !== null
      ) {
        const data = error.response.data as Record<string, unknown>
        message = typeof data.error === 'string' ? data.error : message
      }
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <ClipboardList className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-zinc-100">Welcome Back</h1>
          <p className="text-zinc-400 mt-1">Sign in to Bibz Report</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <AuthForm mode="login" onSubmit={onSubmit} isLoading={isLoading} />

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-900 px-2 text-zinc-500">or</span>
            </div>
          </div>

          <div className="flex justify-center">
            <TelegramVerify
              onAuth={handleTelegramAuth}
              verified={telegramUser !== null}
              verifiedUsername={telegramUser?.username || telegramUser?.first_name}
            />
          </div>
        </div>

        <p className="text-center text-sm text-zinc-500 mt-6">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
