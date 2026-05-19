import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { User as UserIcon, Shield, Activity, Calendar } from 'lucide-react'

interface Group {
  id: string
  title: string
  type: string
  memberCount: number
}

interface Report {
  id: string
  type: string
  status: string
  createdAt: string
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoading: authLoading, checkAuth } = useAuth()
  const [loading, setLoading] = useState(true)
  const [groups] = useState<Group[]>([])
  const [reports] = useState<Report[]>([])

  useEffect(() => {
    const init = async () => {
      const currentUser = await checkAuth()
      if (!currentUser) {
        navigate('/login')
        return
      }
      setLoading(false)
    }
    init()
  }, [checkAuth, navigate])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <UserIcon className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-sm font-medium text-zinc-400">Account</h3>
          </div>
          <p className="text-zinc-100 font-medium">{user.fullName}</p>
          <p className="text-zinc-500 text-sm">{user.email}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-sm font-medium text-zinc-400">Status</h3>
          </div>
          <p className="text-zinc-100 font-medium capitalize">
            {user.isActive ? 'Active' : 'Inactive'}
          </p>
          <p className="text-zinc-500 text-sm">
            {user.isAdmin ? 'Administrator' : 'Member'}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-violet-500/10 rounded-lg">
              <Activity className="w-5 h-5 text-violet-400" />
            </div>
            <h3 className="text-sm font-medium text-zinc-400">Telegram</h3>
          </div>
          <p className="text-zinc-100 font-medium">
            @{user.telegramUsername || user.telegramId}
          </p>
          <p className="text-zinc-500 text-sm">ID: {user.telegramId}</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Groups</h2>
        </div>
        {groups.length === 0 ? (
          <p className="text-zinc-500 text-sm py-4 text-center">
            No groups linked yet. Connect a group to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {groups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
              >
                <div>
                  <p className="text-zinc-100 font-medium">{group.title}</p>
                  <p className="text-zinc-500 text-sm">{group.type}</p>
                </div>
                <span className="text-xs text-zinc-500">{group.memberCount} members</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Report History</h2>
        </div>
        {reports.length === 0 ? (
          <p className="text-zinc-500 text-sm py-4 text-center">
            No reports yet. Your report history will appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-3 px-4 text-zinc-400 font-medium">Type</th>
                  <th className="text-left py-3 px-4 text-zinc-400 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-zinc-400 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} className="border-b border-zinc-800/50">
                    <td className="py-3 px-4 text-zinc-100 capitalize">{report.type}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 text-xs rounded-full bg-zinc-800 text-zinc-300 capitalize">
                        {report.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-500">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
