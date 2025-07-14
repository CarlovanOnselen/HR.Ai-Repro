const restify = require('restify');
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

// Enable CORS middleware
server.use(
  function crossOrigin(req, res, next) {
    res.header('Access-Control-Allow-Origin', 'https://www.labourcheck.com'); // Change to '*' for testing all origins
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.send(200);
      return;
    }
    next();
  }
);

server.listen(process.env.PORT || 3978, () => {
    console.log(`✅ HR.Ai Bot running on port ${process.env.PORT || 3978}`);
});

// Root route (health check)
server.get('/', (req, res, next) => {
    res.send(200, '✅ HR.Ai is running.');
    return next();
});

// Bot endpoint
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

                const reply = data?.choices?.[0]?.message?.content || "🤖 I'm here, but didn’t quite get that.";

                await context.sendActivity(reply);
            } catch (err) {
                console.error("❌ OpenAI API error:", err);
                await context.sendActivity("⚠️ There was an error connecting to HR.Ai.");
            }
        }
    });
    return next();
});
