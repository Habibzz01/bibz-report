import axios from 'axios';
import type { UserRegistration } from '../types.js';

const cache = new Map<string, { data: UserRegistration; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function checkUserRegistration(telegramId: string): Promise<UserRegistration> {
  const cached = cache.get(telegramId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const apiBase = process.env.API_BASE_URL ?? '';
    const apiSecret = process.env.API_SECRET ?? '';

    const response = await axios.get<UserRegistration>(
      `${apiBase}/users/${telegramId}`,
      {
        headers: {
          'X-Bot-Secret': apiSecret,
        },
      }
    );

    const result: UserRegistration = response.data;
    cache.set(telegramId, { data: result, timestamp: Date.now() });
    return result;
  } catch {
    return { registered: false };
  }
}
