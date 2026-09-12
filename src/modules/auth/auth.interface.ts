export interface JwtRefreshPayload {
  sub: string;
  id?: string;
  tokenId: string;
  email: string;
  roles: string[];
}
