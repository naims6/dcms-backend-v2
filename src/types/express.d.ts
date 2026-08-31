import { UserPayload } from '../modules/auth/dto/auth-response.dto';

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}
