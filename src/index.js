const express = require('express');
const dotenv = require('dotenv');
const winston = require('winston');
const axios = require('axios');

// Load environment variables
dotenv.config();

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Validate Discourse webhook secret
const validateDiscourseWebhook = (req, res, next) => {
  const discourseSecret = process.env.DISCOURSE_SECRET;
  const requestSecret = req.headers['x-discourse-event-signature'];

  if (!discourseSecret || !requestSecret || requestSecret !== discourseSecret) {
    logger.error('Invalid webhook secret');
    return res.status(401).json({ error: 'Invalid webhook secret' });
  }
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Discourse webhook endpoint
app.post('/webhook/discourse', validateDiscourseWebhook, async (req, res) => {
  try {
    const payload = req.body;
    logger.info('Received webhook from Discourse', { payload });

    // Format message for Slack
    const message = formatSlackMessage(payload);

    // Send to Slack
    await sendToSlack(message);

    res.status(200).json({ status: 'success' });
  } catch (error) {
    logger.error('Error processing webhook', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Format message for Slack
const formatSlackMessage = (payload) => {
  const post = payload.post;
  const avatarUrl = post.avatar_template.replace('{size}', '48');
  
  return {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: post.topic_title || "New Discourse Post"
        }
      },
      {
        type: "section",
        accessory: {
          type: "image",
          image_url: avatarUrl,
          alt_text: `${post.username}'s avatar`
        },
        text: {
          type: "mrkdwn",
          text: `*Author:* ${post.display_username} (${post.username})${post.user_title ? ` - ${post.user_title}` : ''}\n*Category:* ${post.category_slug || 'N/A'}`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: truncateText(post.raw || '', 300)
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `<${process.env.DISCOURSE_URL || ''}${post.post_url}|View on Discourse> • ${new Date(post.created_at).toLocaleString()} • Post #${post.post_number}`
          }
        ]
      }
    ]
  };
};

// Helper to truncate text
const truncateText = (text, maxLength) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Send message to Slack
const sendToSlack = async (message) => {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error('SLACK_WEBHOOK_URL not configured');
  }

  try {
    await axios.post(webhookUrl, message);
    logger.info('Successfully sent message to Slack');
  } catch (error) {
    logger.error('Error sending message to Slack', { error: error.message });
    throw error;
  }
};

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
}); 