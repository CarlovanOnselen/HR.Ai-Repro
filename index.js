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
  origins: ['https://www.labourcheck.com'], // your frontend domain here
  allowHeaders: ['Authorization', 'Content-Type'],
  exposeHeaders: ['Authorization']
});

server.pre(cors.preflight);
server.use(cors.actual);

// Needed to parse JSON body
server.use(restify.plugins.bodyParser());

// Health check endpoint
server.get('/', (req, res, next) => {
  res.send(200, '✅ HR.Ai is running.');
  return next();
});

// Bot messages endpoint - matches what your frontend should call
server.post('/api/messages', (req, res, next) => {
  adapter.processActivity(req, res, async (context) => {
    if (context.activity.type === 'message') {
      const userMessage = context.activity.text;

      try {
        const response = await fetch(`https://api.openai.com/v1/assistants/${process.env.ASSISTANT_ID}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            thread: { messages: [{ role: "user", content: userMessage }] }
          })
        });

        const data = await response.json();
        const reply = data?.choices?.[0]?.message?.content || "🤖 Sorry, I didn't get that.";

        await context.sendActivity(reply);
      } catch (err) {
        console.error("❌ OpenAI API error:", err);
        await context.sendActivity("⚠️ Error connecting to HR.Ai.");
      }
    }
  });
  return next();
});

// Start server
const PORT = process.env.PORT || 3978;
server.listen(PORT, () => {
  console.log(`✅ HR.Ai Bot running on port ${PORT}`);
});
