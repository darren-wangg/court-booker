interface TimeSlot {
    startHour: number;
    endHour: number;
    formatted: string;
}
interface BookingRequest {
    date: Date;
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
    navigateToBookingPage(targetDate: Date): Promise<boolean>;
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
    }>;
    /**
     * Main booking method
     */
    bookTimeSlot(bookingRequest: BookingRequest): Promise<any>;
    cleanup(): Promise<void>;
}
export {};
//# sourceMappingURL=bookingService.d.ts.map