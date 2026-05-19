# BIBZ REPORT — Full-Stack Telegram Bot System

**Developer:** @XbibzOfficial

## Setup

### Prerequisites
- Node.js 20+
- npm
- Cloudflare account (for API Worker + Pages)
- Turso account (for database)
- Telegram Bot Token (from @BotFather)

### 1. Database (Turso)
```bash
# Install Turso CLI
curl -sSfL https://get.turso.tech | bash

# Create database
turso db create bibz-report

# Get connection URL and auth token
turso db show bibz-report --url
turso db tokens create bibz-report
```

### 2. API (Cloudflare Workers)
```bash
cd api
npm install
npx wrangler deploy
```

Set secrets:
```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put TURSO_URL
npx wrangler secret put TURSO_AUTH_TOKEN
npx wrangler secret put BOT_SECRET
```

### 3. Bot (Railway / Local)
```bash
cd bot
npm install
cp .env.example .env
# Fill in .env with your values
npm run dev
```

### 4. Web (Cloudflare Pages)
```bash
cd web
npm install
npm run build
npx wrangler pages deploy dist/
```

### Environment Variables

#### Bot (.env)
| Variable | Description |
|----------|-------------|
| BOT_TOKEN | Telegram Bot Token |
| SUPER_ADMIN_ID | Telegram User ID of super admin |
| API_BASE_URL | API Worker URL |
| API_SECRET | Shared secret with API |
| TURSO_URL | Turso DB URL |
| TURSO_AUTH_TOKEN | Turso auth token |

#### API (wrangler secrets)
| Variable | Description |
|----------|-------------|
| JWT_SECRET | JWT signing secret |
| TURSO_URL | Turso DB URL |
| TURSO_AUTH_TOKEN | Turso auth token |
| BOT_SECRET | Shared secret with bot |

#### Web (.env)
| Variable | Description |
|----------|-------------|
| VITE_API_URL | API Worker URL |
| VITE_BOT_USERNAME | Bot username (e.g. @xbibzz_bot) |
| VITE_TELEGRAM_BOT_ID | Bot Telegram ID |

## Features
- Report system with inline admin actions
- Admin management (add/list/remove)
- Welcome & farewell messages
- Authentication gate (registered users only)
- Anti-spam (rate limiting + flood detection)
- Anti-link (URLs, t.me invites, @ mentions)
- Anti-toxic (fuzzy profanity filter)
- Web dashboard with Telegram OAuth
- Real-time terminal UI (Ink)
- Turso/SQLite database
- Cloudflare Workers API
