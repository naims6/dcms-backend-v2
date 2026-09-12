# AGENTS.md — DCMS Backend Guidelines

This document provides concise project context and rules for AI coding assistants to ensure high efficiency, consistent code quality, and low token usage.

---

## 1. Project Overview & Tech Stack
- **Framework:** NestJS 11 (Node.js ESM)
- **Language:** TypeScript (Strict Mode)
- **ORM & DB:** Prisma (`@prisma/client`, `@prisma/adapter-pg`) + PostgreSQL
- **Caching:** Redis (`ioredis`)
- **Validation & Parsing:** `class-validator`, `class-transformer`, `zod`
- **Package Manager:** `pnpm` (Do NOT use `npm` or `yarn`)

---

## 2. Directory Structure
```
backend/
├── src/
│   ├── main.ts              # Application entry point
│   ├── app.module.ts        # Root module
│   ├── modules/             # Feature modules (e.g., auth, user)
│   ├── common/              # Shared guards, decorators, filters, interceptors
│   ├── config/              # App environment configs
│   ├── database/            # Database initialization
│   ├── redis/               # Redis module/service
│   └── types/               # Global TypeScript definitions
├── prisma/                  # Prisma schemas & migrations
└── test/                    # End-to-end tests
```

---

## 3. Essential Commands
Always use **pnpm**:
- **Dev Server:** `pnpm start:dev`
- **Build Project:** `pnpm build`
- **Run Unit Tests:** `pnpm test`
- **Run E2E Tests:** `pnpm test:e2e`
- **Lint Code:** `pnpm lint`
- **Prisma Generate:** `pnpm prisma:generate`
- **Prisma Migrate:** `pnpm prisma:migrate`

---

## 4. Coding & Architecture Rules
1. **Package Manager:** Exclusively use `pnpm`.
2. **Modular Architecture:** Keep feature logic contained inside `src/modules/<feature>`. Follow `Controller -> Service -> Prisma/Repository` flow.
3. **Error Handling:** Use NestJS built-in HTTP exceptions or filters in `src/common/filters`. Follow the project's standardized error response payload shape.
4. **Validation:** Apply class-validator decorators on DTOs and validate input at the boundary.
5. **Types:** Avoid using `any`. Define strict interfaces/DTOs for all request/response boundaries.

---

## 5. Efficiency Rules for AI Agents (Token Optimization)
- **Minimal Tool Calls:** Do not run broad filesystem searches or repeated directory listings when file paths are obvious or already known.
- **Surgical Edits:** Only edit lines relevant to the requested feature or fix. Preserve existing docstrings, formatting, and surrounding comments.
- **Verification:** Run `pnpm build` or `pnpm test` to verify changes before completing tasks.
- **Concise Outputs:** Provide direct, concise explanations and code snippets without fluff.
