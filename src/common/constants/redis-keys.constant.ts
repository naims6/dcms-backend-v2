export const REDIS_KEYS = {
  // Key for storing refresh tokens: `auth:refresh:{userId}:{tokenId}`
  refreshToken: (userId: string, tokenId: string) =>
    `auth:refresh:${userId}:${tokenId}`,

  userTokensSet: (userId: string) => `auth:user_tokens:${userId}`,
} as const;
