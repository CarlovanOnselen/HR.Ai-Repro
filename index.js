const restify = require('restify');
const { OpenAI } = require('openai');

// Initialize OpenAI client with your API key from environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const server = restify.createServer();

// Middleware to parse JSON body
server.use(restify.plugins.bodyParser());

server.post('/api/messages', async (req, res) => {
  try {
    const userMessage = req.body.message;
    if (!userMessage) {
      res.send(400, { reply: "⚠️ No message provided." });
      return;
    }

    // Call OpenAI Chat Completion (example)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are HR.Ai, a helpful HR assistant." },
        { role: "user", content: userMessage },
      ],
    });

    const botReply = completion.choices[0].message.content;

    res.send({ reply: botReply });
  } catch (error) {
    console.error(error);
    res.send(500, { reply: "❌ Internal server error." });
  }
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`✅ HR.Ai server is running on port ${PORT}`);
});
