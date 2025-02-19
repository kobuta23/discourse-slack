# Discourse to Slack Integration

A Node.js service that forwards Discourse notifications to Slack with beautiful formatting.

## Features

- Receives webhook notifications from Discourse
- Formats messages with rich Slack blocks including:
  - Post title and content
  - Author information and avatar
  - Category and metadata
  - Direct link to the post
- Secure webhook validation
- Comprehensive logging
- Health check endpoint

## Prerequisites

- Node.js v18+
- A Discourse instance with admin access
- A Slack workspace with permissions to create webhooks

## Setup

1. Clone the repository:
```bash
git clone https://github.com/your-username/discourse-slack.git
cd discourse-slack
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- `PORT`: Server port (default: 3000)
- `SLACK_WEBHOOK_URL`: Your Slack incoming webhook URL
- `DISCOURSE_SECRET`: Webhook secret (must match Discourse settings)
- `DISCOURSE_URL`: Your Discourse instance URL

## Discourse Configuration

1. Go to your Discourse admin panel
2. Navigate to API > Webhooks
3. Click "New Webhook"
4. Configure the webhook:
   - Payload URL: Your server's webhook endpoint
   - Secret: Same value as DISCOURSE_SECRET in your .env
   - Content Type: application/json
   - Select events to trigger the webhook

## Development

Run with auto-reload:
```bash
npm run dev
```

## Production

Start the server:
```bash
npm start
```

## Security

- Keep your `.env` file secure and never commit it
- Use a strong, random webhook secret
- Ensure your server uses HTTPS in production

## License

MIT

## Technical Stack
- Node.js v18+ 
- Express.js v4.18+
- Axios v1.6+ for making webhook requests to Slack
- dotenv for environment variable management
- winston for logging

## API Endpoints
- POST `/webhook/discourse` - Receives Discourse webhook notifications
- GET `/health` - Health check endpoint

## Environment Variables
- `PORT` - Server port (default: 3000)
- `SLACK_WEBHOOK_URL` - Slack incoming webhook URL
- `DISCOURSE_SECRET` - Webhook secret for request validation

## Message Format
Messages sent to Slack will include:
- Post title/topic
- Author name and avatar
- Post content (truncated if needed)
- Link to original post
- Category and tags
- Timestamp
