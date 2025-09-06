#!/usr/bin/env node

require('dotenv').config();
const EmailParser = require('./src/emailParser');
const BookingService = require('./src/services/bookingService');
const config = require('./src/config');

async function debugBookingFlow() {
  console.log('🔍 Debugging Booking Flow');
  console.log('=========================');
  
  try {
    // Step 1: Test email parsing
    console.log('\n📧 Step 1: Testing Email Parsing');
    console.log('--------------------------------');
    
    const parser = new EmailParser();
    await parser.initialize();
    
    // Test booking request parsing
    const testBookingText = "Sunday September 7, 2025\n5 - 6 PM";
    const parsedBooking = parser.parseBookingRequest(testBookingText);
    
    console.log('Test booking text:', testBookingText);
    console.log('Parsed result:', JSON.stringify(parsedBooking, null, 2));
    
    if (parsedBooking.success) {
      console.log('✅ Booking parsing works!');
    } else {
      console.log('❌ Booking parsing failed:', parsedBooking.error);
    }
    
    // Step 2: Test user identification
    console.log('\n👤 Step 2: Testing User Identification');
    console.log('-------------------------------------');
    
    const testEmail = {
      from: 'darrenwng6@gmail.com',
      subject: 'Re: Avalon Court Availability',
      body: testBookingText
    };
    
    const identifiedUser = parser.identifyUserFromEmail(testEmail);
    console.log('Test email from:', testEmail.from);
    console.log('Identified user:', identifiedUser ? identifiedUser.email : 'None');
    
    if (identifiedUser) {
      console.log('✅ User identification works!');
    } else {
      console.log('❌ User identification failed');
      console.log('Available users:', config.users.map(u => u.email));
    }
    
    // Step 3: Test booking service initialization
    console.log('\n🏀 Step 3: Testing Booking Service');
    console.log('----------------------------------');
    
    if (identifiedUser) {
      const bookingService = new BookingService(identifiedUser.id);
      
      try {
        await bookingService.initialize();
        console.log('✅ Booking service initialized successfully');
        
        // Test date parsing
        const testDate = new Date('2025-09-07');
        console.log('Test date:', testDate.toISOString());
        
        // Don't actually try to book, just test initialization
        await bookingService.cleanup();
        console.log('✅ Booking service cleanup successful');
        
      } catch (error) {
        console.log('❌ Booking service failed:', error.message);
      }
    } else {
      console.log('⚠️ Skipping booking service test - no user identified');
    }
    
    console.log('\n✅ Debug complete!');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

debugBookingFlow();
