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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Discourse webhook endpoint - no validation
app.post('/webhook/discourse', async (req, res) => {
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
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Format message for Slack
const formatSlackMessage = (payload) => {
  const post = payload.post;
  const avatarUrl = "https://forum.superfluid.org" + post.avatar_template.replace('{size}', '48');
  
  // Check if this is a new topic or a reply
  const isNewTopic = post.post_number === 1;
  const headerText = isNewTopic ? "🆕 New Topic" : "💬 New Reply";
  
  return {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${headerText}: ${post.topic_title || "Untitled"}`
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
            text: `${isNewTopic ? '📌 New Topic • ' : '↪️ Reply • '}<${process.env.DISCOURSE_URL || ''}${post.post_url}|View on Discourse> • ${new Date(post.created_at).toLocaleString()} • Post #${post.post_number}`
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

// Add this new endpoint
app.get('/logs', (req, res) => {
  const options = {
    from: new Date - 24 * 60 * 60 * 1000,  // last 24 hours
    until: new Date,
    limit: 100,
    start: 0,
    order: 'desc'
  };

  // Read from the combined.log file
  const transport = new winston.transports.File({ filename: 'combined.log' });
  transport.query(options, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Error fetching logs' });
      return;
    }
    res.json(results);
  });
});

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
}); 