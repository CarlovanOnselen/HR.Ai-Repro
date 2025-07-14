const restify = require('restify');
const corsMiddleware = require('restify-cors-middleware2');
const fetch = require('node-fetch');
require('dotenv').config();

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

// Enable body parsing
server.use(restify.plugins.bodyParser());

// Start server
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`✅ HR.Ai Bot running on port ${PORT}`);
});

// Health check
server.get('/', (req, res, next) => {
  res.send(200, '✅ HR.Ai is running.');
  return next();
});

// Main message endpoint
server.post('/api/messages', async (req, res, next) => {
  try {
    const userMessage = req.body.text || req.body.message || '';
    console.log('[User Message]', userMessage);

    // Call OpenAI Assistants API
    const response = await fetch(`https://api.openai.com/v1/assistants/${process.env.ASSISTANT_ID}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        thread: { messages: [{ role: 'user', content: userMessage }] }
      })
    });

    const data = await response.json();
    console.log('[OpenAI Response]', data);

    const reply = data?.choices?.[0]?.message?.content || "🤖 Sorry, I didn't understand that.";
    res.send(200, { reply });
  } catch (error) {
    console.error('❌ Error:', error);
    res.send(500, { reply: "⚠️ Something went wrong. Please try again later." });
  }
  return next();
});
