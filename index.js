const restify = require('restify');
const corsMiddleware = require('restify-cors-middleware2');
const { BotFrameworkAdapter } = require('botbuilder');
require('dotenv').config();
const fetch = require('node-fetch');

// Create adapter
const adapter = new BotFrameworkAdapter({
  appId: process.env.MICROSOFT_APP_ID || '',
  appPassword: process.env.MICROSOFT_APP_PASSWORD || ''
});

// Create server
const server = restify.createServer();

// Setup CORS middleware
const cors = corsMiddleware({
  origins: ['https://www.labourcheck.com'], // Your website domain here
  allowHeaders: ['Authorization', 'Content-Type'],
  exposeHeaders: ['Authorization']
});

server.pre(cors.preflight);
server.use(cors.actual);

// Start server
server.listen(process.env.PORT || 3978, () => {
  console.log(`✅ HR.Ai Bot running on port ${process.env.PORT || 3978}`);
});

// Health check endpoint
server.get('/', (req, res, next) => {
  res.send(200, '✅ HR.Ai is running.');
  return next();
});

// Bot messages endpoint
server.post('/api/messages', (req, res, next) => {
  adapter.processActivity(req, res, async (context) => {
    if (context.activity.type === 'message') {
      const userMessage = context.activity.text;

      try {
        const response = await fetch(`https://api.openai.com/v1/assistants/${process.env.ASSISTANT_ID}/messages`, {
          method: "POST",
