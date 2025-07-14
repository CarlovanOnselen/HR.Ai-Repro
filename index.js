const restify = require('restify');
const corsMiddleware = require('restify-cors-middleware2');
const fetch = require('node-fetch');
require('dotenv').config();

// Create server
const server = restify.createServer();

// Setup CORS for your website
const cors = corsMiddleware({
  origins: ['https://www.labourcheck.com'],
  allowHeaders: ['Authorization', 'Content-Type'],
});
server.pre(cors.preflight);
server.use(cors.actual);

// Enable body parsing
server.use(restify.plugins.bodyParser());

// Start server
server.listen(process.env.PORT || 3978, () => {
  console.log(`✅ HR.Ai Bot running on port ${process.env.PORT || 3978}`);
});

// Health check
server.get('/', (req, res) => {
  res.send(200, '✅ HR.Ai is running.');
});

// Chatbot API endpoint
server.post('/api/messages', async (req, res) => {
  const userMessage = req.body?.text || '';

  console.log('[User Message]', userMessage);

  try {
    const response = await fetch(`https://api.openai.com/v1/assistants/${process.env.ASSISTANT_ID}/threads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    const data = await response.json();
    console.log('[OpenAI Response]', data);

    const reply = data?.choices?.[0]?.message?.content || "🤖 I didn’t quite catch that. Can you rephrase?";
    res.send(200, { reply });
  } catch (err) {
    console.error('❌ OpenAI Error:', err);
    res.send(500, { reply: "⚠️ I'm having trouble responding right now. Try again later." });
  }
});
