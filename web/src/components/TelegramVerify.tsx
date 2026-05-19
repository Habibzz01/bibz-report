import { useEffect, useRef, useState } from 'react'
import { CheckCircle, Loader2 } from 'lucide-react'

declare global {
  interface Window {
    Telegram?: {
      Login?: {
        auth: (options: { bot_id: number; request_access?: string }, callback: (data: TelegramUser) => void) => void
      }
    }
  }
}

export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

interface TelegramVerifyProps {
  onAuth: (user: TelegramUser) => void
  verified?: boolean
  verifiedUsername?: string
}

export default function TelegramVerify({ onAuth, verified, verifiedUsername }: TelegramVerifyProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const botName = 'xbibzz_bot'

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', botName)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-request-access', 'write')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.async = true

    ;(window as unknown as Record<string, unknown>).onTelegramAuth = (user: TelegramUser) => {
      onAuth(user)
    }

    const container = containerRef.current
    if (container) {
      container.innerHTML = ''
      container.appendChild(script)
    }

    const timer = setTimeout(() => setLoading(false), 2000)

    return () => {
      clearTimeout(timer)
      delete (window as unknown as Record<string, unknown>).onTelegramAuth
    }
  }, [onAuth])

  if (verified) {
    return (
      <div className="flex items-center gap-2 p-3 bg-zinc-800/50 border border-emerald-800/50 rounded-lg">
        <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
        <span className="text-sm text-emerald-400">
          Connected as @{verifiedUsername}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-zinc-300">
        Telegram Verification
      </label>
      <div className="flex justify-center p-4 bg-zinc-800/30 border border-dashed border-zinc-700 rounded-lg min-h-[60px] items-center">
        {loading && <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />}
        <div ref={containerRef} className={loading ? 'hidden' : ''} />
      </div>
      <p className="text-xs text-zinc-500 text-center">
        Connect your Telegram account to verify your identity
      </p>
    </div>
  )
}
