require('dotenv').config();
const { PubSub } = require('@google-cloud/pubsub');
const { google } = require('googleapis');

async function createPubSubTopic() {
  try {
    console.log('🔔 Creating Google Cloud Pub/Sub Topic');
    console.log('=====================================');

    const projectId = process.env.GMAIL_PROJECT_ID;
    const topicName = process.env.GMAIL_TOPIC_NAME;

    console.log(`📋 Project ID: ${projectId}`);
    console.log(`📋 Topic Name: ${topicName}`);

    // Initialize OAuth2 client using Gmail credentials
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });

    // Get access token
    const { token } = await oauth2Client.getAccessToken();
    
    // Initialize Pub/Sub with OAuth2 credentials
    const pubSubClient = new PubSub({
      projectId: projectId,
      credentials: {
        client_email: 'oauth2-user',
        private_key: token,
        type: 'oauth2'
      }
    });

    // Check if topic already exists
    const topic = pubSubClient.topic(topicName);
    const [exists] = await topic.exists();

    if (exists) {
      console.log(`✅ Topic '${topicName}' already exists`);
    } else {
      console.log(`🔄 Creating topic '${topicName}'...`);
      await pubSubClient.createTopic(topicName);
      console.log(`✅ Topic '${topicName}' created successfully`);
    }

    // Create subscription for the webhook
    const subscriptionName = 'court-booker-webhook-subscription';
    const subscription = topic.subscription(subscriptionName);
    const [subExists] = await subscription.exists();

    if (subExists) {
      console.log(`✅ Subscription '${subscriptionName}' already exists`);
    } else {
      console.log(`🔄 Creating subscription '${subscriptionName}'...`);
      await topic.createSubscription(subscriptionName, {
        pushConfig: {
          pushEndpoint: process.env.WEBHOOK_URL
        }
      });
      console.log(`✅ Subscription '${subscriptionName}' created successfully`);
    }

    console.log('\n✅ Pub/Sub setup complete! Now you can set up Gmail push notifications.');

  } catch (error) {
    console.error('❌ Failed to create Pub/Sub resources:', error.message);
    
    if (error.message.includes('permission')) {
      console.error('\n💡 You may need to enable the Pub/Sub API or grant permissions.');
      console.error('💡 Try running: gcloud auth login && gcloud config set project court-booker-472209');
    }
  }
}

createPubSubTopic();