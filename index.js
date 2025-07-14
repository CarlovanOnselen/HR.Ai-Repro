// index.js
const restify = require('restify');
const corsMiddleware = require('restify-cors-middleware2');
const fetch = require('node-fetch');
require('dotenv').config();

// Create Restify server
const server = restify.createServer();

// Setup CORS for your website domain
const cors = corsMiddleware({
  origins: ['https://www.labourcheck.com'], // adjust if needed
  allowHeaders: ['Authorization', 'Content-Type'],
  exposeHeaders: ['Authorization']
});
server.pre(cors.preflight);
server.use(cors.actual);

// Enable body parser for JSON
server.use(restify.plugins.bodyParser());

// Health check endpoint
server.get('/', (req, res, next) => {
  res.send(200, '✅ HR.Ai is running.');
  next();
});

// POST /api/messages endpoint to receive chat messages
server.post('/api/messages', async (req, res, next) => {
  const userMessage = req.body.message;

  if (!userMessage || userMessage.trim().length === 0) {
    res.send(400, { error: 'Message is required.' });
    return next();
  }

  try {
    // Call OpenAI Assistants API
    const response = await fetch(`https://api.openai.com/v1/assistants/${process.env.ASSISTANT_ID}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        thread: {
          messages: [
            { role: 'user', content: userMessage }
          ]
        }
      })
    });

    const data = await response.json();

    // Extract reply from OpenAI response
    const reply = data?.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";

    res.send(200, { reply });

  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    res.send(500, { error: 'Internal Server Error' });
  }

  next();
});

// Start the server on Render assigned port or 3978
const PORT = process.env.PORT || 3978;
server.listen(PORT, () => {
  console.log(`✅ HR.Ai backend running on port ${PORT}`);
});
