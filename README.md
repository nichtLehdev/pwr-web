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

- Node.js 20+
- pnpm 10+
- PostgreSQL database

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/posaunenwerk.git
   cd posaunenwerk
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Configure the following variables:

   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/posaunenwerk"
   BETTER_AUTH_SECRET="your-secret-key"
   BETTER_AUTH_URL="http://localhost:3000"
   ```

4. **Set up the database**

   ```bash
   # Generate Prisma client
   pnpm postinstall

   # Run migrations
   pnpm db:migrate

   # (Optional) Seed the database
   pnpm tsx prisma/seed.ts
   ```

5. **Start the development server**

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

## 🐳 Docker

A `docker-compose.yml` and `Dockerfile` are provided for containerized deployment:

```bash
# Start with Docker Compose
docker-compose up -d

# Or build and run manually
docker build -t posaunenwerk .
docker run -p 3000:3000 posaunenwerk
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
