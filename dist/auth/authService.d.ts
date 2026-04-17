export interface SignupResult {
    userId: string;
    email: string;
    memoId: string;
    stellarAddress: string;
}
export interface LoginResult {
    token: string;
    userId: string;
    email: string;
}
export interface JwtPayload {
    userId: string;
    email: string;
}
export declare function signup(email: string, password: string): Promise<SignupResult>;
export declare function login(email: string, password: string): Promise<LoginResult>;
//# sourceMappingURL=authService.d.ts.map