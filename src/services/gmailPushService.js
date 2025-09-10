const { google } = require('googleapis');
const config = require('../config');

class GmailPushService {
  constructor() {
    this.gmail = null;
    this.oauth2Client = null;
    this.watchRequest = null;
  }

  async initialize() {
    try {
      // Initialize OAuth2 client
      this.oauth2Client = new google.auth.OAuth2(
        config.gmailClientId,
        config.gmailClientSecret,
        config.gmailRedirectUri
      );

      // Set credentials
      if (config.gmailRefreshToken) {
        this.oauth2Client.setCredentials({
          refresh_token: config.gmailRefreshToken
        });
      }

      // Initialize Gmail API
      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      
      console.log('✅ Gmail Push Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Gmail Push Service:', error);
      throw error;
    }
  }

  /**
   * Set up Gmail push notifications
   * This tells Gmail to send notifications to our webhook when new emails arrive
   */
  async setupPushNotifications(webhookUrl) {
    try {
      console.log('🔔 Setting up Gmail push notifications...');
      
      // The topic name format for Gmail push notifications
      const topicName = `projects/${config.gmailProjectId}/topics/${config.gmailTopicName}`;
      
      // Set up the watch request
      const watchRequest = {
        topicName: topicName,
        labelIds: ['INBOX'], // Only watch for emails in inbox
        labelFilterBehavior: 'include'
      };

      console.log(`📡 Setting up watch for topic: ${topicName}`);
      console.log(`🔗 Webhook URL: ${webhookUrl}`);

      // Send the watch request to Gmail
      const response = await this.gmail.users.watch({
        userId: 'me',
        requestBody: watchRequest
      });

      this.watchRequest = response.data;
      
      console.log('✅ Gmail push notifications set up successfully');
      console.log(`📊 Watch request ID: ${this.watchRequest.historyId}`);
      console.log(`⏰ Expires at: ${new Date(parseInt(this.watchRequest.expiration))}`);
      
      return this.watchRequest;
    } catch (error) {
      console.error('❌ Failed to set up Gmail push notifications:', error);
      throw error;
    }
  }

  /**
   * Stop Gmail push notifications
   */
  async stopPushNotifications() {
    try {
      if (this.watchRequest) {
        console.log('🛑 Stopping Gmail push notifications...');
        
        await this.gmail.users.stop({
          userId: 'me'
        });
        
        console.log('✅ Gmail push notifications stopped');
        this.watchRequest = null;
      }
    } catch (error) {
      console.error('❌ Failed to stop Gmail push notifications:', error);
      throw error;
    }
  }

  /**
   * Get the current watch status
   */
  async getWatchStatus() {
    try {
      const response = await this.gmail.users.getProfile({
        userId: 'me'
      });
      
      // Since Gmail watch requests are persistent and we just set one up,
      // we'll assume it's active. The watch will expire after 7 days.
      const watchActive = !!this.watchRequest;
      const watchExpiration = this.watchRequest ? new Date(parseInt(this.watchRequest.expiration)) : null;
      
      return {
        email: response.data.emailAddress,
        watchActive: watchActive,
        watchExpiration: watchExpiration
      };
    } catch (error) {
      console.error('❌ Failed to get watch status:', error);
      throw error;
    }
  }

  /**
   * Refresh the watch request (Gmail watch requests expire after 7 days)
   */
  async refreshWatchRequest(webhookUrl) {
    try {
      console.log('🔄 Refreshing Gmail watch request...');
      
      // Stop current watch
      await this.stopPushNotifications();
      
      // Set up new watch
      await this.setupPushNotifications(webhookUrl);
      
      console.log('✅ Gmail watch request refreshed');
    } catch (error) {
      console.error('❌ Failed to refresh watch request:', error);
      throw error;
    }
  }
}

module.exports = GmailPushService;
