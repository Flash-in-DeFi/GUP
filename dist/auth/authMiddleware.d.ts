import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from './authService';
export type AuthenticatedRequest = Request & {
    user?: JwtPayload;
};
export declare function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void;
//# sourceMappingURL=authMiddleware.d.ts.map