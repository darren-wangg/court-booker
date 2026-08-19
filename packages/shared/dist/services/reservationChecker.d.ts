export default class ReservationChecker {
    private browser;
    private page;
    private user;
    private resourceConstraint;
    constructor(userId?: number | null);
    initialize(): Promise<void>;
    initializeBrowserlessChrome(token: any): Promise<void>;
    initializeOptimizedBrowser(): Promise<void>;
    forceProcessCleanup(): Promise<void>;
    checkAvailabilityFallback(): Promise<{
        success: boolean;
        dates: {
            ymd: string;
            date: string;
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
        ymd: any;
        date: any;
        booked: any[];
        available: any[];
        totalSlots: number;
    };
    /**
     * The eight-day window the grid shows, anchored on today in APP_TIMEZONE.
     *
     * Anchored on the user's day, not the site's. The two differ between 9 PM and
     * midnight Pacific, and anchoring on the site's day there made the window skip
     * the user's today and read a day ahead. The site simply has no reservation
     * data for days it has already rolled past, so those days come back looking
     * fully free; the API layer substitutes an earlier snapshot for them and the UI
     * marks them unbookable.
     */
    getNext7Days(): {
        ymd: string;
        day: string;
        monthName: string;
        year: number;
        fullDate: string;
    }[];
    generateTimeSlots(): any[];
    /**
     * Robust browser operation wrapper with context recovery for cloud environments
     * @param operation - The operation to perform
     * @param options - Configuration options
     * @param options.maxRetries - Maximum number of retry attempts (default: 3)
     * @param options.requiresLogin - Whether the operation requires logged-in state (default: false)
     */
    robustBrowserOperation(operation: any, options?: {
        maxRetries?: number;
        requiresLogin?: boolean;
    }): Promise<any>;
    checkAvailability(): Promise<{
        dates: any[];
        totalAvailableSlots: number;
        checkedAt: string;
        timezone: string;
        success: boolean;
    } | {
        success: boolean;
        totalAvailableSlots: number;
        dates: {
            ymd: string;
            date: string;
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