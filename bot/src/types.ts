export interface LogEntry {
  timestamp: string;
  type: 'message' | 'warning' | 'delete' | 'report' | 'join' | 'leave' | 'mute' | 'kick' | 'ban' | 'success' | 'error' | 'info';
  text: string;
}

export interface BotStats {
  messages: number;
  reports: number;
  mutes: number;
  bans: number;
  activeUsers: number;
  messagesPerMinute: number;
}

export interface UserRegistration {
  registered: boolean;
  user?: {
    id: number;
    full_name: string;
    email: string;
    telegram_id: string;
    is_active: number;
  };
}

export interface WarningEntry {
  id: number;
  telegram_id: string;
  reason: string | null;
  warned_by: string;
  warned_at: string;
}

export interface AdminEntry {
  id: number;
  telegram_id: string;
  telegram_username: string | null;
  added_by: string;
  added_at: string;
}
