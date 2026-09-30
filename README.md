# 🏫 DCMS — Dhanbari Collegiate Model School

<div align="center">

[![NestJS](https://img.shields.io/badge/NestJS_11-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

<br/>

**🔗 Links:**
[🌐 Frontend Repo](https://github.com/naims6/dcms-frontend) &nbsp;•&nbsp;
[🌐 Live Demo](https://dcms-frontend-woad.vercel.app)

</div>

---

## 📖 About the Project

**DCMS** (Dhanbari Collegiate Model School — Management System) is the backend REST API powering the school's digital platform. It handles student admissions, payment processing, notice publishing, teacher and student management, and a fully dynamic role-based access control system.

Built to replace slow, paper-based school operations with a structured, secure, and automated API.

---

## ✨ Key Features

### 🔐 Auth & Security
- JWT access + refresh token pair with separate secrets and configurable TTLs
- Refresh token rotation — every use issues a new pair; replaying an old token revokes **all sessions** for that user
- Redis-backed session store with per-token TTL
- bcrypt password hashing · account status check on every login
- Changing password forces a logout across all devices

### 🛡️ Dynamic Role & Permission System (RBAC)
- Create, update, and delete roles at runtime through the API — no code changes needed
- Fine-grained permission strings (e.g. `notice:create`, `admission:review`) synced to DB on startup
- Permissions cached in Redis per user and auto-invalidated when a role changes
- `@Permissions()` decorator + global `PermissionsGuard` enforces access at the controller level

### 🎓 Full Admission Pipeline
A stateful, multi-step admission workflow:

1. **Apply** — Submit form with photo (uploaded to Cloudinary). Application number auto-generated as `ADM-2025-0001`
2. **Verify Email** — 6-digit OTP sent to email, stored in Redis with 10-minute TTL
3. **Pay** — Admission fee via SSLCommerz or bKash
4. **Admin Review** — Paginated list with search by name, email, phone, or application number; filter by status
5. **Accept** — User account, student record, guardians, and addresses created in a single DB transaction. Student ID auto-generated as `STU-2025-0001`. Acceptance email sent automatically.
6. **Reject** — Rejection reason stored and email sent to applicant.

### 💳 Payment Integration
- Provider pattern — SSLCommerz fully integrated, bKash stub ready
- Server-side validation against SSLCommerz API before marking any transaction as paid
- Amount, currency, `store_id`, and `tran_id` all verified against the original record to prevent tampering
- Atomic DB update: `PENDING → VALIDATED` + downstream status change in one transaction

### 📢 Notice System
- Draft / Published lifecycle with automatic `publishedAt` timestamp
- Published notices are public; drafts are admin-only
- **PDF export** — any notice can be downloaded as a formatted A4 PDF, rendered with Puppeteer + Chromium inside Docker. PDFs are cached in memory and only re-rendered when the content changes.

### 🚦 Rate Limiting
`@nestjs/throttler` backed by Redis — rate limits are consistent across multiple server instances. Per-route overrides via a custom `@Throttle()` decorator.

### 👤 Student & Teacher Management
Full CRUD for students (with guardian and address records), teachers, classes, and user accounts. Assign/revoke roles and change account status from the API.

### 📧 Email Notifications
Brevo (Sendinblue) in production, console logger in development. Emails sent for: account creation, admission OTP, admission accepted, admission rejected.

---

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| **Framework** | NestJS 11 (Node.js ESM) |
| **Language** | TypeScript 5 — Strict Mode |
| **Database** | PostgreSQL 18 |
| **ORM** | Prisma 7 |
| **Cache / Sessions** | Redis 8 via ioredis |
| **Authentication** | JWT + bcrypt |
| **Payment** | SSLCommerz, bKash |
| **Media Storage** | Cloudinary |
| **PDF Generation** | Puppeteer + Chromium |
| **Email** | Brevo (Sendinblue) |
| **Validation** | class-validator, Zod |
| **Rate Limiting** | @nestjs/throttler + Redis |
| **Containerization** | Docker, Docker Compose |
| **Package Manager** | pnpm 11 |

---

## 🗂️ Project Structure

```
backend/
├── src/
│   ├── main.ts                   # Bootstrap (CORS, versioning, pipes)
│   ├── app.module.ts
│   ├── common/                   # Guards, decorators, filters, interceptors
│   ├── config/                   # Zod-validated env config
│   ├── redis/                    # Redis module & service
│   ├── modules/
│   │   ├── auth/                 # Login, register, refresh, logout
│   │   ├── rbac/                 # Dynamic roles & permissions
│   │   ├── user/                 # User CRUD, role assignment
│   │   ├── student/              # Student profiles & guardians
│   │   ├── teacher/              # Teacher profiles
│   │   ├── class/                # Class management
│   │   ├── admission/            # Full admission pipeline
│   │   ├── payment/              # SSLCommerz, bKash, callbacks
│   │   ├── notice/               # Notice CRUD + PDF export
│   │   └── mail/                 # Email providers
│   └── types/
├── prisma/                       # Schema & migrations
├── Dockerfile                    # Multi-stage production image
└── compose.yml                   # Postgres, Redis, pgAdmin, RedisInsight
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) `>= 24`
- [pnpm](https://pnpm.io/) `>= 11`
- [Docker](https://www.docker.com/)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/naims6/dcms-backend-v2.git
cd dcms-backend-v2

# 2. Install dependencies
pnpm install

# 3. Start Postgres + Redis
docker compose up -d

# 4. Set up environment variables
cp .env.example .env

# 5. Run migrations
pnpm prisma:migrate

# 6. Start dev server
pnpm start:dev
```

API runs at `http://localhost:3000/api/v1`

### Available Scripts

| Command | Description |
|---|---|
| `pnpm start:dev` | Start with hot reload |
| `pnpm build` | Production build |
| `pnpm test` | Unit tests |
| `pnpm test:e2e` | End-to-end tests |
| `pnpm prisma:migrate` | Run migrations |
| `pnpm prisma:generate` | Regenerate Prisma client |
| `pnpm seed` | Seed the database |

---

## 👤 Author

<p>
  <strong>Naim Sorker</strong><br/>
  Full Stack Developer
</p>

[![Gmail](https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:naimsorker6@gmail.com)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/naims6)
[![YouTube](https://img.shields.io/badge/YouTube-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://youtube.com/@NaimsDev)
[![Facebook](https://img.shields.io/badge/Facebook-1877F2?style=for-the-badge&logo=facebook&logoColor=white)](https://www.facebook.com/naim.sorker6)
