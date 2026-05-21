# NestJS Backend

## Quick Start

```bash
cd backend

# Install dependencies
npm install

# Setup database
npx prisma migrate dev

# Start development server
npm run start:dev
```

## Environment Variables

Copy `.env.example` to `.env` and update values.

```bash
cp .env.example .env
```

### Env usage rule

- In application code, do not read `process.env` directly.
- Use `getEnv()` from `src/config/env.ts` so values are validated and typed.
- `.env` is loaded via Nest `ConfigModule` (see `src/app.module.ts`).

## Available Scripts

- `npm run start:dev` - Development with hot reload
- `npm run build` - Build for production
- `npm run start:prod` - Run production build
- `npm test` - Run unit tests
- `npm test:e2e` - Run E2E tests
- `npm run lint` - Fix linting issues
