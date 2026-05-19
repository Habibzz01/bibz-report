import { useLocation, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LogOut, ClipboardList } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const isDashboard = pathname === '/dashboard'

  if (!isDashboard) {
    return <main className="min-h-screen">{children}</main>
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center gap-2 text-zinc-100 hover:text-indigo-400 transition-colors">
              <ClipboardList className="w-6 h-6 text-indigo-500" />
              <span className="font-semibold text-lg">Bibz Report</span>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-400">{user?.fullName}</span>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {children}
      </main>
    </div>
  )
}
