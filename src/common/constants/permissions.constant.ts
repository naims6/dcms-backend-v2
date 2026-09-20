/**
 * Central registry of all permission strings used across the application.
 * Format: `resource:action`
 *
 * When adding a new module, append its permissions here and create
 * a DB record via POST /rbac/permissions (or the auto-sync on startup).
 */
export const PERMISSIONS = {
  // ── Roles ──────────────────────────────────────────────────────────────
  ROLES_READ: 'roles:read',
  ROLES_CREATE: 'roles:create',
  ROLES_UPDATE: 'roles:update',
  ROLES_DELETE: 'roles:delete',

  // ── Permissions ────────────────────────────────────────────────────────
  PERMISSIONS_READ: 'permissions:read',
  PERMISSIONS_CREATE: 'permissions:create',

  // ── Users ──────────────────────────────────────────────────────────────
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  USERS_ASSIGN_ROLE: 'users:assign_role',
  USERS_REVOKE_ROLE: 'users:revoke_role',

  // ── Students ───────────────────────────────────────────────────────────
  STUDENTS_CREATE: 'students:create',
  STUDENTS_READ: 'students:read',
  STUDENTS_UPDATE: 'students:update',
  STUDENTS_DELETE: 'students:delete',

  // ── Teachers ───────────────────────────────────────────────────────────
  TEACHERS_CREATE: 'teachers:create',
  TEACHERS_READ: 'teachers:read',
  TEACHERS_UPDATE: 'teachers:update',
  TEACHERS_DELETE: 'teachers:delete',

  // ── Admissions ─────────────────────────────────────────────────────────
  ADMISSIONS_READ: 'admissions:read',
  ADMISSIONS_UPDATE: 'admissions:update',

  // ── Notices ────────────────────────────────────────────────────────────
  NOTICES_CREATE: 'notices:create',
  NOTICES_READ: 'notices:read',
  NOTICES_UPDATE: 'notices:update',
  NOTICES_DELETE: 'notices:delete',

  // ── Classes ────────────────────────────────────────────────────────────
  CLASSES_READ: 'classes:read',
} as const;

/** Union type of every permission string — useful for typed checks. */
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Flat array of all permission strings — used for DB sync on startup. */
export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);
