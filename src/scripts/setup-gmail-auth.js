#!/usr/bin/env node

require('dotenv').config();
const { google } = require('googleapis');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function setupGmailAuth() {
  console.log('🔐 Gmail API Authentication Setup');
  console.log('==================================');
  console.log('');
  console.log('This script will help you set up Gmail API authentication.');
  console.log('You\'ll need to create a Google Cloud Project and enable the Gmail API.');
  console.log('');
  console.log('Steps:');
  console.log('1. Go to https://console.cloud.google.com/');
  console.log('2. Create a new project or select existing one');
  console.log('3. Enable the Gmail API');
  console.log('4. Create OAuth 2.0 credentials');
  console.log('5. Download the credentials JSON file');
  console.log('');

  const clientId = await askQuestion('Enter your Gmail Client ID: ');
  const clientSecret = await askQuestion('Enter your Gmail Client Secret: ');
  const redirectUri = await askQuestion('Enter redirect URI (default: http://localhost:3000/oauth2callback): ') || 'http://localhost:3000/oauth2callback';

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  // Generate the URL for OAuth consent
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
  });

  console.log('');
  console.log('🔗 Please visit this URL to authorize the application:');
  console.log(authUrl);
  console.log('');

  const code = await askQuestion('Enter the authorization code from the URL: ');

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    console.log('');
    console.log('✅ Authentication successful!');
    console.log('');
    console.log('Add these environment variables to your .env file:');
    console.log('');
    console.log(`GMAIL_CLIENT_ID=${clientId}`);
    console.log(`GMAIL_CLIENT_SECRET=${clientSecret}`);
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log(`GMAIL_REDIRECT_URI=${redirectUri}`);
    console.log('');

    // Test the connection
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    
    console.log(`✅ Connected to Gmail account: ${profile.data.emailAddress}`);
    console.log('');

  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    process.exit(1);
  }

  rl.close();
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

setupGmailAuth().catch(console.error);