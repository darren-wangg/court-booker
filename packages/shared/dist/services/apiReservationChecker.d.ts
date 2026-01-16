/**
 * API-based Reservation Checker
 * Uses direct API calls instead of Chrome automation for better performance and reliability
 */
export default class ApiReservationChecker {
    private user;
    private axiosInstance;
    private isAuthenticated;
    constructor(userId?: number | null);
    /**
     * Authenticate with the amenity site
     */
    authenticate(): Promise<boolean>;
    /**
     * Fetch all reservations with pagination (like clicking "Show More" repeatedly)
     * The API returns reservations in pages, potentially with overlapping dates
     */
    getAllReservations(startDate: Date): Promise<Map<string, Set<string>>>;
    /**
     * Parse API response to extract booked time slots organized by date
     * Returns a Map of date -> Set of time slots
     */
    parseReservationsToMap(apiResponse: any): Map<string, Set<string>>;
    /**
     * Generate all possible time slots (10 AM - 10 PM)
     */
    generateTimeSlots(): string[];
    /**
     * Get next 7 days
     */
    /**
     * Find booked slots for a specific date from the reservation map
     */
    findBookedSlotsForDate(dateInfo: any, allReservations: Map<string, Set<string>>): string[];
    getNext7Days(): Array<{
        date: Date;
        fullDate: string;
    }>;
    /**
     * Main method to check availability using API
     */
    checkAvailability(): Promise<{
        success: boolean;
        dates: any[];
        totalAvailableSlots: any;
        checkedAt: string;
        method: string;
    }>;
}
//# sourceMappingURL=apiReservationChecker.d.ts.map