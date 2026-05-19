import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import AuthForm from '../components/AuthForm'
import TelegramVerify from '../components/TelegramVerify'
import { registerUser, type User } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { ClipboardList } from 'lucide-react'
import type { TelegramUser } from '../components/TelegramVerify'

interface RegisterFormData {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

export default function Register() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null)

  const handleTelegramAuth = useCallback((user: TelegramUser) => {
    setTelegramUser(user)
    toast.success(`Connected as @${user.username || user.first_name}`)
  }, [])

  const onSubmit = async (data: RegisterFormData | { email: string; password: string }) => {
    const registerData = data as RegisterFormData;
    if (!telegramUser) {
      toast.error('Please verify your Telegram account first')
      return
    }

    setIsLoading(true)
    try {
      const response = await registerUser({
        fullName: registerData.fullName,
        email: registerData.email,
        password: registerData.password,
        telegramId: String(telegramUser.id),
        telegramUsername: telegramUser.username,
        telegramAuthDate: telegramUser.auth_date,
        telegramHash: telegramUser.hash,
      })
      login(response.token, response.user as User)
      toast.success('Account created successfully')
      navigate('/dashboard')
    } catch (error: unknown) {
      let message = 'Registration failed. Please try again.'
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
          <h1 className="text-2xl font-bold text-zinc-100">Create Account</h1>
          <p className="text-zinc-400 mt-1">Join Bibz Report</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
          <TelegramVerify
            onAuth={handleTelegramAuth}
            verified={telegramUser !== null}
            verifiedUsername={telegramUser?.username || telegramUser?.first_name}
          />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-900 px-2 text-zinc-500">or sign up with email</span>
            </div>
          </div>

          <AuthForm mode="register" onSubmit={onSubmit} isLoading={isLoading} />
        </div>

        <p className="text-center text-sm text-zinc-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
