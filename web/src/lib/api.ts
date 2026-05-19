import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bibz_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export interface RegisterData {
  fullName: string
  email: string
  password: string
  telegramId: string
  telegramUsername?: string
  telegramAuthDate?: number
  telegramHash?: string
}

export interface LoginData {
  email: string
  password: string
}

export interface User {
  id: string
  telegramId: string
  fullName: string
  email: string
  telegramUsername?: string
  isAdmin: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface AdminData {
  telegramId: string
  fullName: string
  telegramUsername?: string
}

export interface Admin {
  id: string
  telegramId: string
  fullName: string
  telegramUsername?: string
  createdAt: string
}

function mapUser(raw: Record<string, unknown>): User {
  return {
    id: String(raw.id ?? ''),
    telegramId: String(raw.telegram_id ?? raw.telegramId ?? ''),
    fullName: String(raw.full_name ?? raw.fullName ?? ''),
    email: String(raw.email ?? ''),
    telegramUsername: raw.telegram_username ? String(raw.telegram_username) : undefined,
    isAdmin: raw.is_admin === 1 || raw.isAdmin === true,
    isActive: raw.is_active !== 0 && raw.isActive !== false,
    createdAt: String(raw.created_at ?? raw.createdAt ?? ''),
    updatedAt: String(raw.updated_at ?? raw.updatedAt ?? ''),
  }
}

function mapAdmin(raw: Record<string, unknown>): Admin {
  return {
    id: String(raw.id ?? ''),
    telegramId: String(raw.telegram_id ?? raw.telegramId ?? ''),
    fullName: String(raw.full_name ?? raw.fullName ?? ''),
    telegramUsername: raw.telegram_username ? String(raw.telegram_username) : undefined,
    createdAt: String(raw.created_at ?? raw.createdAt ?? ''),
  }
}

export async function registerUser(data: RegisterData): Promise<AuthResponse> {
  const response = await api.post('/auth/register', data)
  const d = response.data as { token: string; user: Record<string, unknown> }
  return { token: d.token, user: mapUser(d.user) }
}

export async function loginUser(data: LoginData): Promise<AuthResponse> {
  const response = await api.post('/auth/login', data)
  const d = response.data as { token: string; user: Record<string, unknown> }
  return { token: d.token, user: mapUser(d.user) }
}

export async function getCurrentUser(): Promise<User> {
  const response = await api.get('/auth/me')
  const d = response.data as { user: Record<string, unknown> }
  return mapUser(d.user ?? (response.data as Record<string, unknown>))
}

export async function getUserById(telegramId: string): Promise<User> {
  const response = await api.get(`/users/${telegramId}`)
  return mapUser(response.data as Record<string, unknown>)
}

export async function getAdmins(): Promise<Admin[]> {
  const response = await api.get('/admins')
  const d = response.data as { admins: Record<string, unknown>[] }
  return (d.admins ?? []).map(mapAdmin)
}

export async function addAdmin(data: AdminData): Promise<Admin> {
  const response = await api.post('/admins', data)
  return mapAdmin(response.data as Record<string, unknown>)
}

export async function removeAdmin(telegramId: string): Promise<void> {
  await api.delete(`/admins/${telegramId}`)
}

export default api
