export default class ReservationChecker {
    private browser;
    private page;
    private user;
    private resourceConstraint;
    constructor(userId?: number | null);
    initialize(): Promise<void>;
    initializeBrowserlessChrome(token: any): Promise<void>;
    initializeCloudChrome(): Promise<void>;
    forceProcessCleanup(): Promise<void>;
    checkAvailabilityFallback(): Promise<{
        success: boolean;
        dates: {
            date: any;
            booked: any[];
            available: any[];
            totalSlots: number;
            checkedAt: string;
            fallbackMode: boolean;
            message: string;
        }[];
        totalAvailableSlots: number;
        checkedAt: string;
        fallbackMode: boolean;
        cloudCompatibilityMode: boolean;
        message: string;
        error?: undefined;
        timestamp?: undefined;
    } | {
        success: boolean;
        error: string;
        timestamp: string;
        dates?: undefined;
        totalAvailableSlots?: undefined;
        checkedAt?: undefined;
        fallbackMode?: undefined;
        cloudCompatibilityMode?: undefined;
        message?: undefined;
    }>;
    login(): Promise<void>;
    findEmailField(): Promise<string>;
    findPasswordField(): Promise<string>;
    findSubmitButton(): Promise<string>;
    clickShowMoreReservations(): Promise<boolean>;
    loadAllReservations(): Promise<Map<any, any>>;
    findTimeSlotsForDate(dateInfo: any, allReservations: any): {
        date: any;
        booked: any[];
        available: any[];
        totalSlots: number;
    };
    datesMatch(reservationDate: any, dateInfo: any): boolean;
    getNext7Days(): any[];
    generateTimeSlots(): any[];
    /**
     * Robust browser operation wrapper with context recovery for cloud environments
     */
    robustBrowserOperation(operation: any, maxRetries?: number): Promise<any>;
    checkAvailability(): Promise<{
        dates: any[];
        totalAvailableSlots: number;
        checkedAt: string;
        success: boolean;
    } | {
        success: boolean;
        totalAvailableSlots: number;
        dates: {
            date: any;
            booked: any[];
            available: any[];
            totalSlots: number;
            checkedAt: string;
            fallbackMode: boolean;
            message: string;
        }[];
        fallbackMode: boolean;
        message: string;
        cloudCompatibilityMode: boolean;
        timestamp: string;
        reason?: undefined;
    } | {
        success: boolean;
        reason: string;
        timestamp: string;
        totalAvailableSlots?: undefined;
        dates?: undefined;
        fallbackMode?: undefined;
        message?: undefined;
        cloudCompatibilityMode?: undefined;
    }>;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=reservationChecker.d.ts.map