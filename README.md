# AI Links Engagement Automation Engine

A professional networking automation platform for AI Links, built with a monorepo architecture featuring a Next.js admin dashboard, Firebase authentication, and AI-powered engagement automation.

## Project Structure

```
ai-links-engagement/
├── apps/
│   └── admin/                 # Next.js 14 admin dashboard
├── packages/
│   ├── shared-types/         # Shared TypeScript types
│   └── firebase-admin/       # Firebase Admin SDK wrapper
├── pnpm-workspace.yaml       # pnpm workspace configuration
└── package.json              # Root package.json with workspace scripts
```

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: 20.x)
- pnpm 9.0.0+ (install with `npm install -g pnpm`)
- Firebase project with admin credentials

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env.local
   cp apps/admin/.env.example apps/admin/.env.local
   ```

4. Fill in your Firebase credentials in both `.env.local` files

### Development

Start the development server:
```bash
pnpm dev
```

The admin dashboard will be available at `http://localhost:3000`

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Run TypeScript type checking

## Architecture

### Apps

#### Admin Dashboard (`apps/admin`)
- Next.js 14 with TypeScript
- Tailwind CSS for styling
- Firebase client SDK for authentication
- Protected routes requiring admin custom claims
- Login page with email/password and Google authentication

### Packages

#### Shared Types (`packages/shared-types`)
Core data structures:
- `AutomationAccount` - Linked user accounts
- `AutomationKeywords` - Search keywords for engagement
- `AutomationSchedule` - Job scheduling configuration
- `AutomationJob` - Job execution records
- `AutomationActionLog` - Detailed action history
- `DailyUsage` - Usage statistics
- `AdminUser` - Admin user management with custom claims

#### Firebase Admin (`packages/firebase-admin`)
Firebase Admin SDK wrapper providing:
- Initialization and configuration
- Authentication helpers (verify tokens, get users, set custom claims)
- Database helpers (Firestore, Realtime Database)
- Type-safe exports

## Authentication

The system uses Firebase Authentication with custom claims for admin access control:

1. User logs in via email/password or Google
2. Auth context checks for `admin: true` custom claim
3. Non-admin users are logged out with error message
4. Admin users can access the dashboard

### Setting Admin Claims

Use Firebase Console or Admin SDK:
```typescript
await admin.auth().setCustomUserClaims(uid, { admin: true });
```

## Phase 1: Foundation (Complete)
- ✓ Monorepo structure with pnpm workspaces
- ✓ Next.js admin dashboard with TypeScript
- ✓ Tailwind CSS setup
- ✓ Firebase authentication integration
- ✓ Custom admin claims enforcement
- ✓ Protected routes
- ✓ Shared types package
- ✓ Firebase Admin SDK wrapper
- ✓ Environment configuration

## Phase 2: Core Features (Coming)
- Account management UI
- Automation rules configuration
- Job scheduling system
- Database schema implementation
- Action logging system

## Phase 3: AI & Automation (Coming)
- OpenAI integration
- Content generation engine
- Engagement action executor
- Analytics dashboard
- Usage tracking and limits

## Environment Variables

### Root Level (.env.local)
```
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_DATABASE_URL=...
OPENAI_API_KEY=...
```

### Admin App (.env.local)
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_DATABASE_URL=...
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

Proprietary - AI Links
