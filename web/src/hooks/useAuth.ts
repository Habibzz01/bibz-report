import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, type User } from '../lib/api'

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
}

export function useAuth() {
  const navigate = useNavigate()
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('bibz_token'),
    isLoading: true,
  })

  const isAuthenticated = state.token !== null && state.user !== null

  const login = useCallback((token: string, user: User) => {
    localStorage.setItem('bibz_token', token)
    setState({ user, token, isLoading: false })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('bibz_token')
    setState({ user: null, token: null, isLoading: false })
    navigate('/login')
  }, [navigate])

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('bibz_token')
    if (!token) {
      setState({ user: null, token: null, isLoading: false })
      return null
    }
    try {
      const user = await getCurrentUser()
      setState({ user, token, isLoading: false })
      return user
    } catch {
      localStorage.removeItem('bibz_token')
      setState({ user: null, token: null, isLoading: false })
      return null
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return {
    user: state.user,
    token: state.token,
    isAuthenticated,
    isLoading: state.isLoading,
    login,
    logout,
    checkAuth,
  }
}
