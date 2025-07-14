const restify = require('restify');
const corsMiddleware = require('restify-cors-middleware2');
const { OpenAI } = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create Restify server
const server = restify.createServer();

// Enable CORS
const cors = corsMiddleware({
  origins: ['*'], // Replace '*' with ['https://www.labourcheck.com'] for more security
  allowHeaders: ['Authorization'],
  exposeHeaders: ['Authorization']
});

server.pre(cors.preflight);
server.use(cors.actual);
server.use(restify.plugins.bodyParser());

// API endpoint
server.post('/api/messages', async (req, res) => {
  try {
    const userMessage = req.body.message;

    if (!userMessage) {
      res.send(400, { reply: "⚠️ No message provided." });
      return;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are HR.Ai, a helpful HR assistant." },
        { role: "user", content: userMessage },
      ],
    });

    const botReply = completion.choices[0].message.content;
    res.send({ reply: botReply });
  } catch (err) {
    console.error('❌ Error:', err);
    res.send(500, { reply: "❌ Internal server error." });
  }
});

// Start server
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`✅ HR.Ai server is running on port ${PORT}`);
});
