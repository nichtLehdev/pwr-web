# Posaunenwerk Rheinland

Web platform for the Posaunenwerk Rheinland brass music association. Manages events, courses, news, and organizational information.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=flat-square&logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwind-css)
![tRPC](https://img.shields.io/badge/tRPC-11-2596BE?style=flat-square&logo=trpc)
![Better Auth](https://img.shields.io/badge/Better%20Auth-1.4-000000?style=flat-square)
![React Query](https://img.shields.io/badge/React%20Query-5-FF4154?style=flat-square&logo=react-query)
![pnpm](https://img.shields.io/badge/pnpm-10-F69220?style=flat-square&logo=pnpm)

## Tech Stack

- **Next.js 16** (App Router) + **TypeScript**
- **tRPC** (end-to-end typesafe APIs)
- **Prisma** + **PostgreSQL**
- **Better Auth** (authentication)
- **Tailwind CSS**

## Quick Start

### Docker (Recommended)

```bash
# 1. Clone and configure
git clone https://github.com/nichtLehdev/pwr-web.git
cd pwr-web

# 2. Set environment variables
# Required: DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_GITHUB_CLIENT_ID, 
#           BETTER_AUTH_GITHUB_CLIENT_SECRET, GITHUB_TOKEN, GITHUB_REPO
# Optional: SMTP_* (for email)

# 3. Start services
docker compose up -d

# 4. (Optional) Seed database
docker compose run --rm --profile seed db-seed
```

Visit [http://localhost:3000](http://localhost:3000)

### Local Development

```bash
# Install dependencies
pnpm install

# Start database (or use ./start-database.sh)
docker run -d --name posaunenwerk-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=posaunenwerk \
  -p 5432:5432 postgres:16-alpine

# Setup database
pnpm db:migrate
pnpm tsx prisma/seed.ts  # Optional

# Start dev server
pnpm dev
```

## Environment Variables

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Auth secret (generate: `openssl rand -base64 32`)
- `BETTER_AUTH_GITHUB_CLIENT_ID` - GitHub OAuth client ID
- `BETTER_AUTH_GITHUB_CLIENT_SECRET` - GitHub OAuth secret
- `GITHUB_TOKEN` - GitHub API token
- `GITHUB_REPO` - GitHub repository (format: `owner/repo`)

**Optional (Email):**
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`

## Scripts

| Command             | Description                    |
| ------------------- | ------------------------------ |
| `pnpm dev`          | Development server             |
| `pnpm build`        | Production build               |
| `pnpm start`        | Production server              |
| `pnpm check`        | Lint + type check              |
| `pnpm db:migrate`   | Run migrations                 |
| `pnpm db:studio`    | Open Prisma Studio             |
| `pnpm test:email`   | Test email configuration       |

## Project Structure

```
src/
├── app/              # Next.js pages (aktuelles, dashboard, termine, etc.)
├── server/api/       # tRPC routers
├── server/better-auth/ # Auth configuration
├── lib/              # Utilities
└── trpc/             # tRPC client
prisma/
├── schema.prisma     # Database schema
└── migrations/       # Migration history
```

## Features

**Public:**
- Event calendar, course listings, news, organization info, downloads

**Dashboard (Authenticated):**
- Content management (events, courses, posts)
- Registration management
- Approval workflow (DRAFT → PENDING → APPROVED)
- Role-based access (ADMIN, LPW, RPW, OBLEUTE, USER)

## User Roles

- `ADMIN` - Full access
- `LPW` - Landesposaunenwart (can approve all content)
- `RPW` - Regionalposaunenwart (can approve for assigned districts)
- `OBLEUTE` - District representatives (can create, needs approval)
- `USER` - Regular users

## Database Models

Key entities: `User`, `Event`, `Course`, `Post`, `Bezirk`, `Ensemble`, `AuswahlChor`, `Location`, `Media`, `Download`, `CourseRegistration`

## Docker Services

- `db` - PostgreSQL 16
- `db-migrate` - Runs migrations on startup
- `db-seed` - Optional seeding (profile: seed)
- `app` - Next.js application

## Documentation

See [docs/](./docs/) for detailed documentation:

- [Architecture](./docs/architecture.md) - Tech stack and project structure
- [API Reference](./docs/api.md) - tRPC routers and endpoints
- [Development Guide](./docs/development.md) - Setup and development workflow
- [Deployment](./docs/deployment.md) - Production deployment guide
- [Email Testing](./EMAIL_TESTING.md) - SMTP configuration
- [Social Media Export](./docs/social-media-export.md) - Instagram post generation

## License

Proprietary software for Posaunenwerk Rheinland.
