# Posaunenwerk Rheinland

A modern web platform for the Posaunenwerk Rheinland - the regional brass music association in the Rhineland region of Germany. This application serves as a central hub for managing events, courses, news, and organizational information for brass choirs and musicians.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=flat-square&logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwind-css)

## ✨ Features

### Public Features

- 📅 **Event Calendar** - Interactive calendar view for concerts, services, rehearsals, and other events
- 📚 **Course Management** - Browse and register for music courses and workshops
- 📰 **News & Updates** - Stay informed with the latest posts and announcements
- 🎵 **Organization Info** - Learn about districts, ensembles, leadership, and more
- 📥 **Downloads** - Access sheet music and other resources

### Dashboard Features (Authenticated)

- 🎯 **Content Management** - Create, edit, and manage events and courses
- 👥 **Participant Management** - Track registrations and participants
- ✅ **Approval Workflow** - Review and approve content submissions
- 📊 **Bulk Operations** - Select, duplicate, delete, or change status of multiple items
- 🔐 **Role-Based Access** - Different permissions for Admin, LPW, RPW, Obleute, and Users

## 🛠️ Tech Stack

This project is built with the [T3 Stack](https://create.t3.gg/):

- **[Next.js 16](https://nextjs.org)** - React framework with App Router
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[tRPC](https://trpc.io)** - End-to-end typesafe APIs
- **[Prisma](https://prisma.io)** - Type-safe database ORM
- **[PostgreSQL](https://www.postgresql.org/)** - Relational database
- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first CSS framework
- **[Better Auth](https://www.better-auth.com/)** - Authentication library
- **[React Query](https://tanstack.com/query)** - Server state management

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── aktuelles/         # News/posts section
│   ├── dashboard/         # Admin dashboard
│   ├── foerderverein/     # Supporter association
│   ├── kontakt/           # Contact page
│   ├── materialien/       # Resources/downloads
│   ├── mitmachen/         # Participation info
│   ├── termine/           # Events calendar
│   ├── ueber-uns/         # About us pages
│   └── _components/       # Shared components
├── lib/                   # Utility functions and types
├── server/                # Server-side code
│   ├── api/              # tRPC routers
│   └── better-auth/      # Auth configuration
├── styles/               # Global styles
└── trpc/                 # tRPC client setup
prisma/
├── schema.prisma         # Database schema
├── seed.ts              # Database seeding
└── migrations/          # Database migrations
```

## 🚀 Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10+
- PostgreSQL 16+ (or Docker)

### Option 1: Docker (Recommended)

The easiest way to run the project is using Docker Compose:

1. **Clone and configure**

   ```bash
   git clone https://github.com/nichtLehdev/pwr-web.git
   cd pwr-web
   cp .env.example .env
   ```

2. **Configure environment variables** in `.env`:

   ```bash
   # Generate a secure password
   POSTGRES_PASSWORD=your_secure_password

   # Generate auth secret (Linux/macOS)
   openssl rand -base64 32
   # Or Windows PowerShell:
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
   ```

   Set `BETTER_AUTH_SECRET` to the generated value.

3. **Start the application**

   ```bash
   docker compose up -d
   ```

   This will:
   - Start PostgreSQL database
   - Run database migrations automatically
   - Start the Next.js application

4. **(Optional) Seed with sample data**

   ```bash
   docker compose run --rm --profile seed db-seed
   ```

5. **Open the application**

   Navigate to [http://localhost:3000](http://localhost:3000)

### Option 2: Local Development

1. **Clone the repository**

   ```bash
   git clone https://github.com/nichtLehdev/pwr-web.git
   cd pwr-web
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Configure the required variables (see `.env.example` for details).

4. **Start the database**

   Using the provided script:

   ```bash
   ./start-database.sh
   ```

   Or using Docker directly:

   ```bash
   docker run -d --name posaunenwerk-db \
     -e POSTGRES_PASSWORD=password \
     -e POSTGRES_DB=posaunenwerk \
     -p 5432:5432 postgres:16-alpine
   ```

5. **Set up the database**

   ```bash
   # Run migrations
   pnpm db:migrate

   # (Optional) Seed the database
   pnpm tsx prisma/seed.ts
   ```

6. **Start the development server**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📜 Available Scripts

| Command             | Description                             |
| ------------------- | --------------------------------------- |
| `pnpm dev`          | Start development server with Turbopack |
| `pnpm build`        | Build for production                    |
| `pnpm start`        | Start production server                 |
| `pnpm check`        | Run linting and type checking           |
| `pnpm lint`         | Run ESLint                              |
| `pnpm lint:fix`     | Fix ESLint errors                       |
| `pnpm format:check` | Check code formatting                   |
| `pnpm format:write` | Format code with Prettier               |
| `pnpm db:generate`  | Generate Prisma migrations              |
| `pnpm db:migrate`   | Deploy database migrations              |
| `pnpm db:push`      | Push schema changes (dev only)          |
| `pnpm db:studio`    | Open Prisma Studio                      |

## 🗄️ Database

### Key Models

- **User** - User accounts with roles and permissions
- **Event** - Concerts, services, rehearsals, and other events
- **Course** - Music courses and workshops with registration
- **Post** - News articles and announcements
- **Bezirk** - Regional districts
- **Ensemble** - Local brass choirs
- **AuswahlChor** - Select/elite choirs

### User Roles

| Role      | Description                            |
| --------- | -------------------------------------- |
| `ADMIN`   | Full system access                     |
| `LPW`     | Landesposaunenwart (regional director) |
| `RPW`     | Regionalposaunenwart (area director)   |
| `OBLEUTE` | District representatives               |
| `USER`    | Regular authenticated users            |

## 🐳 Docker Reference

### Services

| Service      | Description                                        |
| ------------ | -------------------------------------------------- |
| `db`         | PostgreSQL 16 database with health checks          |
| `db-migrate` | Runs Prisma migrations on startup (init container) |
| `db-seed`    | Seeds the database with sample data (optional)     |
| `app`        | Next.js application (production build)             |

### Commands

| Command                                          | Description                             |
| ------------------------------------------------ | --------------------------------------- |
| `docker compose up -d`                           | Start all services in background        |
| `docker compose up -d --build`                   | Rebuild and start services              |
| `docker compose down`                            | Stop all services                       |
| `docker compose down -v`                         | Stop and remove volumes (deletes data!) |
| `docker compose logs -f app`                     | Follow application logs                 |
| `docker compose logs -f db`                      | Follow database logs                    |
| `docker compose run --rm --profile seed db-seed` | Seed database with sample data          |
| `docker compose ps`                              | Show running containers                 |
| `docker compose exec db psql -U posaunenwerk`    | Connect to database                     |

### Production Deployment

For production environments:

1. **Use strong passwords** - Generate a secure `POSTGRES_PASSWORD`
2. **Set proper URLs** - Update `NEXT_PUBLIC_APP_URL` to your domain
3. **Use HTTPS** - Set up a reverse proxy (nginx, traefik, caddy) with SSL
4. **Backup database** - Set up regular backups of the `posaunenwerk_postgres_data` volume

Example production `.env`:

```env
POSTGRES_PASSWORD=your_very_secure_password_here
BETTER_AUTH_SECRET=generated_secret_at_least_32_chars
NEXT_PUBLIC_APP_URL=https://your-domain.com
BETTER_AUTH_URL=https://your-domain.com
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software for the Posaunenwerk Rheinland.

## 🔗 Links

- [T3 Stack Documentation](https://create.t3.gg/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [tRPC Documentation](https://trpc.io/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
