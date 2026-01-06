# Architecture Overview

## Tech Stack

Built on the [T3 Stack](https://create.t3.gg/) for type-safe full-stack development.

### Core Technologies

- **Next.js 16** - React framework with App Router, Server Components, and API routes
- **TypeScript** - Type safety across the entire codebase
- **tRPC** - End-to-end typesafe APIs without code generation
- **Prisma** - Type-safe database ORM with PostgreSQL
- **Better Auth** - Authentication and session management
- **Tailwind CSS** - Utility-first styling
- **React Query** - Server state management and caching

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── _components/        # Shared React components
│   ├── api/                # API routes (uploads, auth, etc.)
│   ├── dashboard/          # Admin dashboard pages
│   └── [pages]/            # Public pages (aktuelles, termine, etc.)
├── server/
│   ├── api/routers/        # tRPC routers (events, courses, posts, etc.)
│   ├── better-auth/        # Auth configuration
│   ├── db.ts              # Prisma client instance
│   └── email/             # Email templates and sending
├── lib/                    # Shared utilities
└── trpc/                   # tRPC client setup
```

## Data Flow

1. **Client** → tRPC client → **API Route** (`/api/trpc/[trpc]`)
2. **API Route** → tRPC server → **Router** (e.g., `eventsRouter`)
3. **Router** → **Prisma** → **PostgreSQL**
4. Response flows back through the same path

## Authentication

- **Better Auth** handles sessions, OAuth (GitHub), and email verification
- Session stored in database (`Session` model)
- Protected routes use `protectedProcedure` in tRPC routers
- Role-based access via `adminProcedure`, `lpwProcedure`, `reviewerProcedure`

## Content Workflow

1. **Create** → Status: `DRAFT` or `PENDING`
2. **Submit** → Status: `PENDING` (requires approval)
3. **Review** → LPW/RPW approves/rejects
4. **Publish** → Status: `APPROVED` (visible to public)

## File Uploads

- Files uploaded via `/api/upload`
- Stored in `public/uploads/` directory
- Metadata stored in `Media` model
- Review workflow: `PENDING` → `APPROVED`

