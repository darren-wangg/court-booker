const { google } = require('googleapis');
const config = require('./config');

class EmailParser {
  constructor() {
    this.gmail = null;
    this.oauth2Client = null;
  }

  async initialize() {
    try {
      // Initialize OAuth2 client
      this.oauth2Client = new google.auth.OAuth2(
        config.gmailClientId,
        config.gmailClientSecret,
        config.gmailRedirectUri
      );

      // Set credentials if we have them
      if (config.gmailRefreshToken) {
        this.oauth2Client.setCredentials({
          refresh_token: config.gmailRefreshToken
        });
      }

      // Initialize Gmail API
      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      
      console.log('✅ Gmail API initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Gmail API:', error);
      throw error;
    }
  }

  /**
   * Parse date from email text
   * Supports formats like: "September 7, 2025", "Sep 7, 2025", "9/7/2025"
   */
  parseDate(text) {
    const datePatterns = [
      // "September 7, 2025" or "Sep 7, 2025"
      /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})/i,
      // "9/7/2025" or "09/07/2025"
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      // "2025-09-07"
      /(\d{4})-(\d{1,2})-(\d{1,2})/
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          let dateStr;
          if (pattern === datePatterns[0]) {
            // Month name format
            dateStr = `${match[1]} ${match[2]}, ${match[3]}`;
          } else if (pattern === datePatterns[1]) {
            // MM/DD/YYYY format
            dateStr = `${match[1]}/${match[2]}/${match[3]}`;
          } else {
            // YYYY-MM-DD format
            dateStr = `${match[3]}-${match[1]}-${match[2]}`;
          }
          
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            return {
              original: match[0],
              parsed: parsedDate,
              formatted: parsedDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
            };
          }
        } catch (error) {
          console.error('Error parsing date:', error);
        }
      }
    }

    return null;
  }

  /**
   * Parse time from email text
   * Supports formats like: "5 - 6 PM", "5:00 - 6:00 PM", "17:00 - 18:00"
   */
  parseTime(text) {
    const timePatterns = [
      // "5 - 6 PM" or "5:00 - 6:00 PM"
      /(\d{1,2})(?::\d{2})?\s*-\s*(\d{1,2})(?::\d{2})?\s*(AM|PM)/i,
      // "5 - 6" (assume PM if no AM/PM)
      /(\d{1,2})(?::\d{2})?\s*-\s*(\d{1,2})(?::\d{2})?/,
      // "17:00 - 18:00" (24-hour format)
      /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/
    ];

    for (const pattern of timePatterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          let startTime, endTime;
          
          if (pattern === timePatterns[0]) {
            // 12-hour format with AM/PM
            const startHour = parseInt(match[1]);
            const endHour = parseInt(match[2]);
            const period = match[3].toUpperCase();
            
            startTime = this.convertTo24Hour(startHour, period);
            endTime = this.convertTo24Hour(endHour, period);
          } else if (pattern === timePatterns[1]) {
            // 12-hour format without AM/PM (assume PM)
            const startHour = parseInt(match[1]);
            const endHour = parseInt(match[2]);
            
            startTime = this.convertTo24Hour(startHour, 'PM');
            endTime = this.convertTo24Hour(endHour, 'PM');
          } else {
            // 24-hour format
            startTime = parseInt(match[1]);
            endTime = parseInt(match[3]);
          }

          return {
            original: match[0],
            startHour: startTime,
            endHour: endTime,
            formatted: `${startTime > 12 ? startTime - 12 : startTime}:00 ${startTime >= 12 ? 'PM' : 'AM'} - ${endTime > 12 ? endTime - 12 : endTime}:00 ${endTime >= 12 ? 'PM' : 'AM'}`
          };
        } catch (error) {
          console.error('Error parsing time:', error);
        }
      }
    }

    return null;
  }

  convertTo24Hour(hour, period) {
    if (period === 'AM') {
      return hour === 12 ? 0 : hour;
    } else { // PM
      return hour === 12 ? 12 : hour + 12;
    }
  }

  /**
   * Parse booking request from email text
   */
  parseBookingRequest(emailText) {
    const date = this.parseDate(emailText);
    const time = this.parseTime(emailText);

    if (!date || !time) {
      return {
        success: false,
        error: 'Could not parse date or time from email',
        parsed: { date, time }
      };
    }

    return {
      success: true,
      date: date.parsed,
      time: time,
      formatted: {
        date: date.formatted,
        time: time.formatted
      }
    };
  }

  /**
   * Get recent emails from Gmail
   */
  async getRecentEmails(maxResults = 10) {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults: maxResults,
        q: 'is:unread' // Only unread emails
      });

      return response.data.messages || [];
    } catch (error) {
      console.error('Error fetching emails:', error);
      throw error;
    }
  }

  /**
   * Get email content by message ID
   */
  async getEmailContent(messageId) {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const message = response.data;
      const headers = message.payload.headers;
      
      // Extract basic email info
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const from = headers.find(h => h.name === 'From')?.value || '';
      const date = headers.find(h => h.name === 'Date')?.value || '';

      // Extract email body
      let body = '';
      if (message.payload.body.data) {
        body = Buffer.from(message.payload.body.data, 'base64').toString();
      } else if (message.payload.parts) {
        // Handle multipart emails
        for (const part of message.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body.data) {
            body = Buffer.from(part.body.data, 'base64').toString();
            break;
          }
        }
      }

      return {
        id: messageId,
        subject,
        from,
        date,
        body: body.trim()
      };
    } catch (error) {
      console.error('Error getting email content:', error);
      throw error;
    }
  }

  /**
   * Mark email as read
   */
  async markAsRead(messageId) {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        resource: {
          removeLabelIds: ['UNREAD']
        }
      });
    } catch (error) {
      console.error('Error marking email as read:', error);
    }
  }

  /**
   * Check for new booking requests
   */
  async checkForBookingRequests() {
    try {
      console.log('🔍 Checking for new booking requests...');
      
      const messages = await this.getRecentEmails(5);
      const bookingRequests = [];

      for (const message of messages) {
        const email = await this.getEmailContent(message.id);
        
        // Check if this is a reply to our availability email
        if (email.subject.includes('Re:') && email.subject.includes('Avalon Court Availability')) {
          console.log(`📧 Found potential booking request: ${email.subject}`);
          
          const bookingRequest = this.parseBookingRequest(email.body);
          
          if (bookingRequest.success) {
            console.log(`✅ Parsed booking request: ${bookingRequest.formatted.date} at ${bookingRequest.formatted.time}`);
            bookingRequests.push({
              emailId: message.id,
              email: email,
              booking: bookingRequest
            });
            
            // Mark as read
            await this.markAsRead(message.id);
          } else {
            console.log(`❌ Failed to parse booking request: ${bookingRequest.error}`);
          }
        }
      }

      return bookingRequests;
    } catch (error) {
      console.error('Error checking for booking requests:', error);
      throw error;
    }
  }
}

module.exports = EmailParser;
