// Load env vars
require('dotenv').config();

// Required packages
const restify = require('restify');
const corsMiddleware = require('restify-cors-middleware2');
const fetch = require('node-fetch');

// Create server
const server = restify.createServer();

// Setup CORS
const cors = corsMiddleware({
  origins: ['https://www.labourcheck.com'],
  allowHeaders: ['Authorization', 'Content-Type'],
  exposeHeaders: ['Authorization']
});
server.pre(cors.preflight);
server.use(cors.actual);

// Enable JSON body parsing
server.use(restify.plugins.bodyParser());

// ✅ Start server
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`✅ HR.Ai server is running on port ${PORT}`);
});

// ✅ Health route
server.get('/', (req, res, next) => {
  res.send(200, '✅ HR.Ai is running.');
  return next();
});

// ✅ POST /api/messages – Handle chat message and talk to OpenAI Assistant
server.post('/api/messages', async (req, res) => {
  const userMessage = req.body?.text || '';

  try {
    // 1️⃣ Create a thread
    const threadRes = await fetch("https://api.openai.com/v1/threads", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    const thread = await threadRes.json();
    const threadId = thread.id;

    // 2️⃣ Post message to the thread
    await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'user',
        content: userMessage
      })
    });

    // 3️⃣ Run assistant
    const runRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assistant_id: process.env.ASSISTANT_ID
      })
    });
    const run = await runRes.json();

    // 4️⃣ Poll until complete
    let runStatus = run.status;
    while (runStatus === 'queued' || runStatus === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${run.id}`, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      });
      const statusData = await statusRes.json();
      runStatus = statusData.status;
    }

    // 5️⃣ Fetch assistant's reply
    const messagesRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      }
    });

    const messages = await messagesRes.json();
    const lastMessage = messages.data.find(m => m.role === 'assistant');

    // ✅ Return message to frontend
    res.send(200, {
      reply: lastMessage?.content?.[0]?.text?.value || "🤖 I didn’t quite catch that."
    });

  } catch (err) {
    console.error('❌ Error:', err);
    res.send(500, { reply: "⚠️ Something went wrong on the server." });
  }
});
