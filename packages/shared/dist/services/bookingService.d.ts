import { Ymd } from '../utils/dates';
interface TimeSlot {
    startHour: number;
    endHour: number;
    formatted: string;
}
interface BookingRequest {
    /** The calendar day to book, "YYYY-MM-DD". */
    day: Ymd;
    time: TimeSlot;
    formatted: {
        date: string;
        time: string;
    };
}
export default class BookingService {
    private browser;
    private page;
    private user;
    private resourceConstraint;
    private connectError;
    constructor(userId?: number | null);
    initialize(): Promise<void>;
    initializeBrowserlessChrome(token: string): Promise<void>;
    initializeCloudBookingChrome(): Promise<void>;
    login(): Promise<void>;
    findEmailField(): Promise<string>;
    findPasswordField(): Promise<string>;
    findSubmitButton(): Promise<string>;
    /**
     * Navigate to the booking page for a specific date
     */
    navigateToBookingPage(targetDay: Ymd): Promise<boolean>;
    /**
     * Select start and end times from dropdowns
     */
    selectTimeSlot(targetTime: TimeSlot): Promise<boolean>;
    /**
     * Convert 24-hour format to 12-hour format for dropdown selection
     */
    convertTo12HourFormat(hour24: number): string;
    /**
     * Complete the booking process
     */
    completeBooking(): Promise<{
        success: boolean;
        message: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        message?: undefined;
    }>;
    /**
     * True for errors that mean the Browserless session died mid-operation
     * (typically the free plan's 60s cap being hit), not a real form/selector
     * problem. Worth reconnecting and retrying; anything else isn't.
     */
    isRecoverableConnectionError(error: any): boolean;
    /**
     * Login, navigate to the day, and pick the time slot — restarting the browser
     * session and redoing all three if the connection drops partway through.
     * Safe to retry in full because nothing has been submitted to the site yet.
     * completeBooking() is deliberately outside this retry loop: once the submit
     * button has been clicked, we can no longer tell a dropped connection apart
     * from an unconfirmed success, and retrying could double-book the court.
     */
    setupBooking(bookingRequest: BookingRequest, maxAttempts?: number): Promise<void>;
    /**
     * Main booking method
     */
    bookTimeSlot(bookingRequest: BookingRequest): Promise<any>;
    cleanup(): Promise<void>;
}
export {};
//# sourceMappingURL=bookingService.d.ts.map