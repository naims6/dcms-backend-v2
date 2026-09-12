/**
 * Centralized Type-Safe Redis Key Factory
 *
 * Senior Practice: Never hardcode magic string keys in services.
 * Use this factory for auto-completion, zero typos, and easy maintenance.
 */
export const REDIS_KEYS = {
  /**
   * Key for individual active refresh token session: `auth:refresh:{userId}:{tokenId}`
   */
  refreshToken: (userId: string, tokenId: string) =>
    `auth:refresh:${userId}:${tokenId}`,

  /**
   * Redis Set containing active refresh token IDs for a user: `auth:user_tokens:{userId}`
   */
  userTokensSet: (userId: string) => `auth:user_tokens:${userId}`,

  /**
   * Key for Email Verification / OTPs
   */
  emailOtp: (email: string) => `otp:email:${email}`,

  /**
   * Key for Rate Limiting
   */
  rateLimit: (identifier: string, endpoint: string) =>
    `rate_limit:${identifier}:${endpoint}`,

  /**
   * Key for User Cache
   */
  userCache: (userId: string) => `cache:user:${userId}`,
} as const;
