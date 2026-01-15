interface User {
    id: number;
    email: string;
    password: string;
}
interface Timeouts {
    navigation: number;
    waitForSelector: number;
    betweenActions: number;
}
declare const TIMEOUTS: Timeouts;
declare const users: User[];
declare function getUser(userId?: number | null): User | null;
export { users, getUser, TIMEOUTS, };
export declare const amenityUrl: string;
export declare const schedulePattern: string;
export declare const headless: boolean;
export declare const timeouts: Timeouts;
export type { User, Timeouts };
//# sourceMappingURL=config.d.ts.map