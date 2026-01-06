# Development Guide

## Setup

1. Install dependencies: `pnpm install`
2. Copy environment variables (see README)
3. Start database: `./start-database.sh` or Docker
4. Run migrations: `pnpm db:migrate`
5. (Optional) Seed data: `pnpm tsx prisma/seed.ts`
6. Start dev server: `pnpm dev`

## Code Style

- **TypeScript** - Strict mode enabled
- **ESLint** - Next.js config with TypeScript rules
- **Prettier** - Auto-formatting on save
- **Tailwind** - Utility-first CSS

## Database Changes

```bash
# Create migration
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Development: push schema changes (no migration)
pnpm db:push

# View database
pnpm db:studio
```

## Adding New Features

1. **Database**: Update `prisma/schema.prisma`, run `pnpm db:generate`
2. **API**: Create/update router in `src/server/api/routers/`
3. **UI**: Create components in `src/app/_components/` or page in `src/app/`
4. **Types**: Types are auto-generated from Prisma and tRPC

## Testing

- **Email**: `pnpm test:email` (requires SMTP config)
- **Type checking**: `pnpm typecheck`
- **Linting**: `pnpm lint`
- **Formatting**: `pnpm format:check`

## Common Tasks

### Add New Content Type

1. Add model to `schema.prisma`
2. Create router in `server/api/routers/`
3. Add to `server/api/root.ts`
4. Create dashboard pages in `app/dashboard/`
5. Create public pages if needed

### Add New User Role

1. Add to `UserRole` enum in `schema.prisma`
2. Create procedure helper in `server/api/trpc.ts`
3. Update permission checks in routers
4. Update UI role checks

### Email Templates

- Templates in `src/server/email/templates/`
- Use React Email components
- Test with `pnpm test:email`

## Debugging

- **tRPC errors**: Check browser console and server logs
- **Database**: Use Prisma Studio (`pnpm db:studio`)
- **Auth issues**: Check Better Auth logs and session table
- **File uploads**: Check `public/uploads/` directory and `Media` table

