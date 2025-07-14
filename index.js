// index.js

const restify = require('restify');
const corsMiddleware = require('restify-cors-middleware2');
const fetch = require('node-fetch');
require('dotenv').config();

// Create server
const server = restify.createServer();

// Middleware for CORS
const cors = corsMiddleware({
  origins: ['https://www.labourcheck.com'],
  allowHeaders: ['Authorization', 'Content-Type'],
  exposeHeaders: ['Authorization']
});
server.pre(cors.preflight);
server.use(cors.actual);
server.use(restify.plugins.bodyParser());

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`✅ HR.Ai server is running on port ${PORT}`);
});

// Health check route
server.get('/', (req, res, next) => {
  res.send(200, { status: '✅ HR.Ai is live and ready.' });
  return next();
});

// POST handler for chatbot
server.post('/api/messages', async (req, res) => {
  try {
    const userMessage = req.body.text;
    if (!userMessage) {
      return res.send(400, { reply: "⚠️ No message provided." });
    }

    // 1. Create new thread
    const threadRes = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      }
    });

    const thread = await threadRes.json();
    const threadId = thread.id;

    // 2. Add user message to thread
    await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        role: 'user',
        content: userMessage
      })
    });

    // 3. Run assistant on thread
    const runRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        assistant_id: process.env.ASSISTANT_ID
      })
    });

    const run = await runRes.json();

    // 4. Poll run status until complete
    let runStatus = 'queued';
    while (runStatus === 'queued' || runStatus === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const statusRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${run.id}`, {
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
      });
      const status = await statusRes.json();
      runStatus = status.status;
    }

    // 5. Get messages from thread
    const messagesRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
    });

    const messages = await messagesRes.json();

    if (!messages || !Array.isArray(messages.data)) {
      console.error('❌ Unexpected response from OpenAI:', messages);
      return res.send(500, { reply: "⚠️ I didn't get a valid response from the assistant." });
    }

    const lastMessage = messages.data.find(m => m.role === 'assistant');

    res.send(200, {
      reply: lastMessage?.content?.[0]?.text?.value || "🤖 I didn’t quite catch that."
    });

  } catch (err) {
    console.error('❌ Server error:', err);
    res.send(500, { reply: "⚠️ I'm having trouble right now. Please try again later." });
  }
});
