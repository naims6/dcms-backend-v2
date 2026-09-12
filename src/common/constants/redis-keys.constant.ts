export const REDIS_KEYS = {
  // Key for storing refresh tokens: `auth:refresh:{userId}:{tokenId}`
  refreshToken: (userId: string, tokenId: string) =>
    `auth:refresh:${userId}:${tokenId}`,

  userTokensSet: (userId: string) => `auth:user_tokens:${userId}`,

  // Key for caching a user's flat permission list: `rbac:permissions:{userId}`
  // TTL: 5 minutes — invalidated explicitly on role/permission changes.
  userPermissions: (userId: string) => `rbac:permissions:${userId}`,
} as const;

/** TTL (seconds) for the user permissions cache entry. */
export const PERMISSIONS_CACHE_TTL = 300; // 5 minutes
