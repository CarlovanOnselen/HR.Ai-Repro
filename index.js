import restify from 'restify';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const server = restify.createServer();

server.use(restify.plugins.bodyParser());

// Simple CORS middleware:
server.pre((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'OPTIONS, GET, POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.send(204);
    return;
  }
  return next();
});

server.post('/api/messages', async (req, res, next) => {
  try {
    const { message, memory, files } = req.body;
    if (!message) {
      res.send(400, { error: "No message provided" });
      return next();
    }

    const completion = await openai.assistants.chat.completions.create({
      assistant: "asst_CvpjeE9OxLq5bqHLFbSmanBP",
      input: {
        content: message,
        memory: memory || [],
        files: files || [],
      },
    });

    res.send({ reply: completion.choices[0].message.content });
  } catch (error) {
    console.error('Error in /api/messages:', error);
    res.send(500, { error: error.message || "Internal server error" });
  }
  return next();
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`✅ HR.Ai server running on port ${PORT}`);
});
