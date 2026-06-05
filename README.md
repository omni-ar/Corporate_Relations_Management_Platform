# TPO-Ops

**Corporate Relations & Placement Operations Platform**

A production-grade enterprise application for university Training & Placement Officers (TPOs) to manage corporate recruitment drives, track company relationships, and analyze placement outcomes.

Built with TypeScript across the full stack. Express.js serves the API, React powers the frontend, PostgreSQL stores the data, and Docker packages everything for deployment.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development](#local-development)
  - [Docker Deployment](#docker-deployment)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Authentication](#authentication)
- [Seed Data](#seed-data)
- [CI/CD](#cicd)
- [Environment Variables](#environment-variables)
- [License](#license)

---

## Features

**Placement Drive Management**
- Full pipeline tracking: Contacted → Interested → PPT Scheduled → OA Scheduled → Interview Scheduled → Completed
- One-click status advancement with state machine enforcement (drives can only move forward)
- Schedule conflict detection for overlapping drives
- Drive types: Full-Time Employment (FTE), Internship, or Both

**Company Registry**
- Searchable company directory with industry classification
- Sortable data table with real-time filtering
- Per-company drive history and status tracking

**Analytics Dashboard**
- KPI cards: total companies, active drives, average CTC, highest package, selection rate
- Industry distribution (pie chart)
- Placement funnel: appeared → shortlisted → selected
- CTC comparison by company (horizontal bar chart)
- Top recruiting companies ranked by drive count and offers
- Interactive geographic map of recruiting company locations (Leaflet)

**Audit Logging**
- Every status change is automatically logged with timestamps
- Logs include: user, drive, action, previous status, new status, metadata
- Searchable audit trail for compliance and review

**Enterprise UI**
- Design inspired by Linear, Notion, and Stripe Dashboard
- Light mode (default) and dark mode with localStorage persistence
- Fully responsive from 320px mobile to ultrawide desktop
- Inter typeface, Deep Indigo color system, Shadcn/ui component library

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Client (React)                   │
│  Wouter routing · TanStack Query · Recharts · Leaflet│
└──────────────────────┬──────────────────────────────┘
                       │ HTTP (JSON)
┌──────────────────────┴──────────────────────────────┐
│                  Server (Express.js)                │
│  JWT auth · REST API · Drizzle ORM · Audit logging  │
└──────────────────────┬──────────────────────────────┘
                       │ SQL
┌──────────────────────┴──────────────────────────────┐
│                 PostgreSQL 15                        │
│  users · companies · placement_drives · audit_logs  │
└─────────────────────────────────────────────────────┘
```

The application is a monorepo. In development, Vite proxies the frontend through the Express server on a single port (5000). In production, the Express server serves the pre-built static assets from `dist/public/`.

---

## Tech Stack

| Layer     | Technology                                                                 |
|-----------|----------------------------------------------------------------------------|
| Runtime   | Node.js 20, TypeScript 5.6                                                |
| Backend   | Express.js 5, Drizzle ORM, PostgreSQL 15                                  |
| Frontend  | React 19, Wouter, TanStack React Query, Recharts 2, Leaflet, Framer Motion|
| UI        | Shadcn/ui, Tailwind CSS 4, Radix UI primitives                            |
| Auth      | JWT (access + refresh tokens), bcrypt                                      |
| Build     | Vite 7 (client), esbuild (server)                                          |
| DevOps    | Docker, Docker Compose, GitHub Actions                                     |

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ (local or Docker)
- npm 10+

### Local Development

1. **Clone the repository**

```bash
git clone https://github.com/<your-username>/tpo-ops.git
cd tpo-ops
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

```bash
cp .env.example .env
```

Edit `.env` with your local PostgreSQL credentials:

```
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/tpo_ops
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
```

Generate secure JWT secrets:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

4. **Push the database schema**

```bash
npm run db:push
```

5. **Seed sample data** (optional)

```bash
npx tsx script/seed.ts
```

This creates an admin user (`admin` / `admin123`), 10 companies, 18 placement drives, and 75 audit log entries.

6. **Start the development server**

```bash
npm run dev
```

The application will be available at `http://localhost:5000`.

### Docker Deployment

Requires Docker and Docker Compose.

```bash
docker compose up --build
```

This starts three services:

| Service      | Purpose                                      | Port  |
|-------------|----------------------------------------------|-------|
| `app`       | Production Node.js server                    | 5000  |
| `db`        | PostgreSQL 15                                | 5433  |
| `db-migrate`| Pushes Drizzle schema on startup, then exits | —     |

After the containers are running, seed the database from the host machine:

```bash
# Windows (PowerShell)
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/tpo_ops"
npx tsx script/seed.ts

# macOS / Linux
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/tpo_ops" npx tsx script/seed.ts
```

The application will be available at `http://localhost:5000`.

To stop and remove all containers and data:

```bash
docker compose down -v
```

---

## Project Structure

```
tpo-ops/
├── client/                     # React frontend
│   ├── index.html              # Entry HTML with meta tags
│   ├── favicon.png             # Custom TPO-Ops favicon
│   └── src/
│       ├── App.tsx             # Router and auth context
│       ├── main.tsx            # React entry point
│       ├── index.css           # Global styles and design tokens
│       ├── pages/
│       │   ├── login.tsx       # Split-screen login page
│       │   ├── dashboard.tsx   # KPI cards, pipeline, activity feed
│       │   ├── drives.tsx      # Pipeline stepper with status management
│       │   ├── companies.tsx   # Searchable, sortable data table
│       │   ├── analytics.tsx   # Charts, funnel, map, top companies
│       │   ├── audit-logs.tsx  # Audit trail viewer
│       │   └── profile.tsx     # User profile and logout
│       ├── components/
│       │   ├── app-layout.tsx  # Sidebar, header, theme toggle
│       │   ├── CompanyMap.tsx  # Leaflet map component
│       │   └── ui/            # Shadcn/ui component library
│       ├── hooks/              # Custom React hooks
│       └── lib/
│           ├── auth.tsx        # AuthContext, authFetch, JWT handling
│           ├── queryClient.ts  # TanStack Query configuration
│           └── utils.ts        # Utility functions
├── server/
│   ├── index.ts               # Express app setup, middleware, server start
│   ├── routes.ts              # All API route handlers
│   ├── storage.ts             # Database access layer (IStorage interface)
│   ├── static.ts              # Production static file serving
│   └── vite.ts                # Development Vite middleware
├── shared/
│   └── schema.ts              # Drizzle ORM schema (single source of truth)
├── script/
│   ├── build.ts               # Production build (Vite + esbuild)
│   └── seed.ts                # Database seed script
├── Dockerfile                  # Multi-stage production build
├── docker-compose.yml          # App + PostgreSQL + migration
├── .github/workflows/ci.yml   # GitHub Actions CI pipeline
├── drizzle.config.ts           # Drizzle Kit configuration
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies and scripts
```

---

## Database Schema

Four tables managed by Drizzle ORM:

**users**

| Column             | Type    | Notes                          |
|--------------------|---------|--------------------------------|
| id                 | varchar | UUID, primary key              |
| username           | text    | Unique                         |
| password_hash      | text    | bcrypt hash                    |
| role               | text    | `TPO_Admin` or `Coordinator`   |
| refresh_token_hash | text    | Hashed refresh token           |

**companies**

| Column   | Type    | Notes                          |
|----------|---------|--------------------------------|
| id       | varchar | UUID, primary key              |
| name     | text    | Unique                         |
| industry | text    | e.g., IT / Software, Consulting|

**placement_drives**

| Column              | Type    | Notes                                                       |
|---------------------|---------|-------------------------------------------------------------|
| id                  | varchar | UUID, primary key                                           |
| company_id          | varchar | FK → companies.id (cascade delete)                          |
| drive_date          | text    | YYYY-MM-DD                                                  |
| drive_start_time    | text    | HH:mm                                                      |
| drive_end_time      | text    | HH:mm                                                      |
| drive_type          | text    | FTE, Internship, or Both                                    |
| status              | text    | CONTACTED → INTERESTED → PPT_SCHEDULED → OA_SCHEDULED → INTERVIEW_SCHEDULED → COMPLETED |
| min_ctc             | integer | In rupees                                                   |
| max_ctc             | integer | In rupees                                                   |
| students_eligible   | integer |                                                             |
| students_appeared   | integer |                                                             |
| students_shortlisted| integer |                                                             |
| students_selected   | integer |                                                             |

**audit_logs**

| Column          | Type      | Notes                           |
|-----------------|-----------|--------------------------------|
| id              | varchar   | UUID, primary key              |
| user_id         | varchar   | FK → users.id (set null)       |
| drive_id        | varchar   | FK → placement_drives.id (cascade) |
| action          | text      | STATUS_UPDATE, DRIVE_CREATED, etc. |
| previous_status | text      | Nullable                       |
| new_status      | text      | Nullable                       |
| metadata        | jsonb     | Additional context             |
| created_at      | timestamp | Auto-set                       |

---

## API Reference

All API routes are prefixed with `/api`. Protected routes require a valid JWT in the `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint             | Auth | Description                    |
|--------|----------------------|------|--------------------------------|
| POST   | /api/auth/register   | No   | Create a new user account      |
| POST   | /api/auth/login      | No   | Login, returns access + refresh tokens |
| POST   | /api/auth/refresh    | No   | Refresh access token using cookie |
| POST   | /api/auth/logout     | Yes  | Invalidate refresh token       |
| GET    | /api/auth/me         | Yes  | Get current user profile       |

### Companies

| Method | Endpoint             | Auth | Description                    |
|--------|----------------------|------|--------------------------------|
| GET    | /api/companies       | Yes  | List all companies             |
| POST   | /api/companies       | Yes  | Create a new company           |
| GET    | /api/companies/:id   | Yes  | Get company by ID              |
| DELETE | /api/companies/:id   | Yes  | Delete company and its drives  |

### Placement Drives

| Method | Endpoint             | Auth | Description                    |
|--------|----------------------|------|--------------------------------|
| GET    | /api/drives          | Yes  | List all placement drives      |
| POST   | /api/drives          | Yes  | Create a new drive             |
| PATCH  | /api/drives/:id      | Yes  | Update drive (status, details) |
| DELETE | /api/drives/:id      | Yes  | Delete a drive                 |

### Analytics

| Method | Endpoint                  | Auth | Description                         |
|--------|---------------------------|------|-------------------------------------|
| GET    | /api/analytics/overview   | Yes  | CTC stats, funnel metrics           |
| GET    | /api/analytics/industry   | Yes  | Company count by industry           |

### Audit Logs

| Method | Endpoint             | Auth | Description                    |
|--------|----------------------|------|--------------------------------|
| GET    | /api/audit-logs      | Yes  | All audit logs with company context |

### Health Check

| Method | Endpoint   | Auth | Description                    |
|--------|------------|------|--------------------------------|
| GET    | /healthz   | No   | Returns company count as health indicator |

---

## Authentication

The application uses a dual-token JWT strategy:

- **Access token** (15 min TTL): sent as `Authorization: Bearer <token>` header. Stored in `localStorage`.
- **Refresh token** (7 days TTL): sent as an `HttpOnly` cookie named `tpo_refresh_token`. Used to silently obtain new access tokens.

On the client side, `authFetch` automatically intercepts 401 responses, attempts a token refresh via `/api/auth/refresh`, and retries the original request. If the refresh also fails, the user is redirected to the login page.

**Default credentials** (created by the seed script):

```
Username: admin
Password: admin123
```

---

## Seed Data

Run the seed script to populate the database with realistic placement data:

```bash
npx tsx script/seed.ts
```

This creates:

| Entity         | Count | Examples                                            |
|----------------|-------|-----------------------------------------------------|
| Admin user     | 1     | admin / admin123                                    |
| Companies      | 10    | Amazon, Microsoft, Google, Goldman Sachs, Deloitte, Adobe, etc. |
| Placement drives | 18  | Across all 6 pipeline stages, FTE and Internship    |
| Audit log entries | 75 | Auto-generated per status transition                |

The seed script is idempotent — it checks for existing data before inserting.

---

## CI/CD

GitHub Actions runs on every push and pull request to `main` or `master`:

1. Spins up a PostgreSQL 15 service container
2. Installs dependencies (`npm ci`)
3. Runs TypeScript type checking (`tsc --noEmit`)
4. Builds the production bundle (`npm run build`)
5. Builds the Docker image (`docker build`)

Configuration: `.github/workflows/ci.yml`

---

## Environment Variables

| Variable            | Required | Default | Description                                |
|---------------------|----------|---------|--------------------------------------------|
| DATABASE_URL        | Yes      | —       | PostgreSQL connection string               |
| JWT_ACCESS_SECRET   | Yes      | —       | Secret for signing access tokens           |
| JWT_REFRESH_SECRET  | Yes      | —       | Secret for signing refresh tokens          |
| NODE_ENV            | No       | development | `development` or `production`          |
| PORT                | No       | 5000    | Server port                                |

---

## Available Scripts

| Command          | Description                                        |
|------------------|----------------------------------------------------|
| `npm run dev`    | Start development server (Express + Vite HMR)     |
| `npm run build`  | Build production bundle (client + server)          |
| `npm start`      | Run production server from dist/                   |
| `npm run check`  | Run TypeScript type checker                        |
| `npm run db:push`| Push Drizzle schema to database                    |

---

## License

MIT
