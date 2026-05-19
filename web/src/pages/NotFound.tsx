import { Link } from 'react-router-dom'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <FileQuestion className="w-20 h-20 text-zinc-700 mx-auto mb-6" />
        <h1 className="text-6xl font-bold text-zinc-100 mb-2">404</h1>
        <p className="text-xl text-zinc-400 mb-8">Page Not Found</p>
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/dashboard"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            to="/login"
            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-lg transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
