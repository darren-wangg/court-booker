/**
 * ⚠️  DEPRECATED - Worker API Server
 *
 * This file is NO LONGER USED in the current architecture.
 *
 * The system now uses Browserless.io for cloud browser automation.
 * Next.js API routes call BookingService and ReservationChecker directly.
 * No DigitalOcean droplet is needed anymore.
 *
 * This file is kept for reference only.
 * See MIGRATION_FROM_DIGITALOCEAN.md for migration details.
 *
 * ---
 *
 * OLD DESCRIPTION:
 * Worker API Server
 * Ran on DigitalOcean droplet to handle Puppeteer operations
 * Was called by Next.js serverless functions via HTTP
 */

require('dotenv').config();
import express, { Request, Response, NextFunction } from 'express';
import ReservationChecker from '../services/reservationChecker';
import BookingService from '../services/bookingService';
import { saveAvailabilitySnapshot } from '../utils/supabaseClient';
import { getUser } from '../config';

const app = express();
app.use(express.json());

const WORKER_SECRET = process.env.WORKER_SECRET;
const PORT = parseInt(process.env.WORKER_PORT || '3001');

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

// Simple authentication middleware
function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!WORKER_SECRET) {
    console.warn('⚠️  WORKER_SECRET not set - API is unsecured!');
    return next();
  }
  
  if (token !== WORKER_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
}

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    service: 'Court Booker Worker API',
    timestamp: new Date().toISOString(),
  });
});

// Check availability endpoint
app.post('/api/check-availability', authenticate, async (req: Request, res: Response) => {
  try {
    const userId: number | null = req.body.userId || null;
    console.log(`🔍 Availability check requested for user: ${userId || 'default'}`);
    
    const checker = new ReservationChecker(userId);
    const result = await checker.checkAvailability();
    
    // Save to Supabase
    try {
      await saveAvailabilitySnapshot(result, 'api', userId);
      console.log('✅ Availability saved to Supabase');
    } catch (supabaseError: any) {
      console.error('⚠️  Failed to save to Supabase:', supabaseError.message);
      // Continue anyway - the check succeeded
    }
    
    res.json({ 
      success: true, 
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Availability check failed:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Book endpoint
app.post('/api/book', authenticate, async (req: Request, res: Response) => {
  try {
    const { date, time, userId } = req.body;
    
    if (!date || !time) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: date and time' 
      });
    }
    
    console.log(`🏀 Booking requested: ${date} at ${time}`);
    
    // Parse date
    const bookingDate = new Date(date);
    if (isNaN(bookingDate.getTime())) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid date format' 
      });
    }
    
    // Parse time - handle both string and object formats
    let timeSlot: TimeSlot | null = null;
    if (typeof time === 'string') {
      // Parse "5:00 PM - 6:00 PM" or "5 - 6 PM" format
      const timeMatch = time.match(/(\d{1,2})(?::\d{2})?\s*(AM|PM)?\s*-\s*(\d{1,2})(?::\d{2})?\s*(AM|PM)?/i);
      if (timeMatch) {
        let startHour = parseInt(timeMatch[1]);
        let endHour = parseInt(timeMatch[3]);
        const startPeriod = timeMatch[2]?.toUpperCase() || 'PM';
        const endPeriod = timeMatch[4]?.toUpperCase() || 'PM';
        
        // Convert to 24-hour format
        if (startPeriod === 'PM' && startHour !== 12) startHour += 12;
        if (startPeriod === 'AM' && startHour === 12) startHour = 0;
        if (endPeriod === 'PM' && endHour !== 12) endHour += 12;
        if (endPeriod === 'AM' && endHour === 12) endHour = 0;
        
        timeSlot = {
          startHour,
          endHour,
          formatted: time,
        };
      }
    } else if (time.startHour && time.endHour) {
      timeSlot = {
        startHour: time.startHour,
        endHour: time.endHour,
        formatted: time.formatted || `${time.startHour}:00 - ${time.endHour}:00`,
      };
    }
    
    if (!timeSlot) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid time format. Expected "5:00 PM - 6:00 PM" or {startHour, endHour}' 
      });
    }
    
    // Create booking request
    const bookingRequest: BookingRequest = {
      date: bookingDate,
      time: timeSlot,
      formatted: {
        date: bookingDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        time: timeSlot.formatted,
      },
    };
    
    // Run booking
    const bookingService = new BookingService(userId);
    const result = await bookingService.bookTimeSlot(bookingRequest);
    
    res.json({ 
      success: result.success,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Booking failed:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Worker API server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔒 Authentication: ${WORKER_SECRET ? 'Enabled' : 'Disabled (WARNING: Unsecured!)'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});
