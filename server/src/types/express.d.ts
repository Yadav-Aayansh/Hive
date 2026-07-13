import type { UserRole } from "../entity/User";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
        collegeId: string | null;
        jti: string;
      };
    }
  }
}

export {};
