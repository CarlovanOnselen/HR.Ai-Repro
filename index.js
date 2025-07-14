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
  origins: ['https://www.labourcheck.com'],
  allowHeaders: ['Authorization', 'Content-Type'],
  exposeHeaders: ['Authorization']
});
server.pre(cors.preflight);
server.use(cors.actual);

// Enable request body parsing
server.use(restify.plugins.bodyParser());

// Start server
server.listen(process.env.PORT || 3978, () => {
  console.log(`✅ HR.Ai Bot running on port ${process.env.PORT || 3978}`);
});

// Health check
server.get('/', (req, res, next) => {
  res.send(200, '✅ HR.Ai is running.');
  return next();
});

// 🔧 CORRECTED: Use full (req, res, next) signature for Restify compatibility
server.post('/api/messages', (req, res, next) => {
  adapter.processActivity(req, res, async (context) => {
    if (context.activity.type === 'message') {
      const userMessage = context.activity.text;
      console.log('[User Message]', userMessage);

      try {
        const response = await fetch(`https://api.openai.com/v1/assistants/${process.env.ASSISTANT_ID}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            thread: {
              messages: [{ role: 'user', content: userMessage }]
            }
          })
        });

        const data = await response.json();
        console.log('[OpenAI Response]', data);

        const reply = data?.choices?.[0]?.message?.content || "🤖 I didn’t quite catch that. Can you rephrase?";
        await context.sendActivity(reply);
      } catch (err) {
        console.error('❌ Error from OpenAI:', err);
        await context.sendActivity("⚠️ I'm having trouble right now. Please try again later.");
      }
    }
  });

  // ✅ Important: return next() here for Restify chain
  return next();
});
