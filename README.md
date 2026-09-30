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
- **Safe Logins:** Uses secure access tokens and refresh tokens to keep users safely logged in.
- **Auto-Logout on Suspicious Activity:** If someone tries to reuse an old or stolen token, the system immediately logs out all active sessions for that user.
- **Fast Session Management:** Active sessions are stored in Redis with automatic expiration.
- **Strong Password Protection:** Passwords are encrypted with bcrypt, and user account status is checked on every login.
- **Logout Across All Devices:** Changing your password instantly logs you out from every device.

### 🛡️ Dynamic Roles & Permissions (RBAC)
- **No Code Changes Needed:** You can create, edit, or delete user roles anytime through the API or dashboard without touching any code.
- **Precise Permissions:** Easily assign specific actions to roles (like `notice:create` to write notices or `admission:review` to check applications).
- **Instant Updates:** Permissions are cached in Redis and update immediately when a role is changed.
- **Protected Routes:** Built-in guards check user permissions before allowing access to any sensitive action.

### 🎓 Full Admission Pipeline
A simple, complete step-by-step admission process:

1. **Apply Online** — Applicants fill out the form and upload their photo (stored safely in Cloudinary). The system automatically creates an application ID (like `ADM-2025-0001`).
2. **Verify Email** — A 6-digit verification code (OTP) is sent to the applicant's email (valid for 10 minutes).
3. **Pay Admission Fee** — Applicants pay the fee online securely via SSLCommerz.
4. **Admin Review** — School staff can search through applications by name, email, phone, or application number, and filter by status.
5. **Accept Applicant** — With one click, the system creates the student login account, student profile, guardian details, and home address. It automatically generates a Student ID (like `STU-2025-0001`) and sends an acceptance email.
6. **Reject Applicant** — If an application is rejected, the reason is saved and an email explanation is automatically sent to the applicant.

### 💳 Payment Integration (SSLCommerz)
- **Real-Time Verification:** Every payment is verified directly with SSLCommerz before marking it as paid.
- **Tamper-Proof:** The system verifies the amount, currency, store ID, and transaction ID against the database record to prevent fraud.
- **Automatic Status Updates:** Once the payment is verified, the system automatically marks the transaction as completed and updates the application.

### 📢 Notice Board & PDF Download
- **Draft & Publish:** Write notices as drafts first, then publish them whenever you are ready.
- **Public & Private:** Published notices are visible to everyone; drafts can only be seen by admins.
- **Download as PDF:** Any notice can be downloaded as a clean, ready-to-print A4 PDF. PDFs are cached so they download quickly without re-rendering every time.

### 🚦 Rate Limiting
- **Server Protection:** Protects the API from spam, abuse, or too many requests using Redis and throttler guards.
- **Custom Limits:** Easy to set custom limits for specific routes (like login or payment endpoints).

### 👤 Student, Teacher & Class Management
- **Complete Records:** Full control (create, view, update, delete) for students, parent/guardian info, and home addresses.
- **Teachers & Classes:** Easily manage teacher profiles, classes, sections, and user accounts.
- **Role Assignment:** Assign or change user roles and activate or suspend accounts anytime from the API.

### 📧 Email Notifications
- **Automated Emails:** Uses Brevo (Sendinblue) to reliably deliver emails (logs to console in development).
- **Automatic Emails For:**
  - New account creation details
  - 6-digit admission OTP code
  - Admission accepted confirmation
  - Admission rejected notification with reason

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
| **Payment** | SSLCommerz |
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
│   │   ├── payment/              # SSLCommerz integration & callbacks
│   │   ├── notice/               # Notice CRUD + PDF export
│   │   └── mail/                 # Email providers
│   └── types/
├── prisma/                       # Schema & migrations
├── Dockerfile                    # Multi-stage production image
└── compose.yml                   # Postgres, Redis, pgAdmin, RedisInsight
```

---

## 🚀 Getting Started

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
