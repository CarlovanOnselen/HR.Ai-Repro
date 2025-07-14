const restify = require('restify');
const corsMiddleware = require('restify-cors-middleware2');
const { OpenAI } = require('openai');

require('dotenv').config(); // Make sure .env contains OPENAI_API_KEY and ASSISTANT_ID

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const server = restify.createServer();
const cors = corsMiddleware({
  origins: ['*'], // Or restrict to your frontend origin
  allowHeaders: ['Authorization'],
  exposeHeaders: ['Authorization'],
});

server.pre(cors.preflight);
server.use(cors.actual);
server.use(restify.plugins.bodyParser());

server.get('/', (req, res, next) => {
  res.send(200, { message: '✅ HR.Ai Server Online' });
  return next();
});

server.post('/api/messages', async (req, res) => {
  const userMessage = req.body.text || req.body.message;

  if (!userMessage) {
    return res.send(400, { reply: '⚠️ No message provided.' });
  }

  try {
    const thread = await openai.beta.threads.create();

    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: userMessage,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.ASSISTANT_ID,
    });

    let runStatus;
    do {
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      if (runStatus.status !== 'completed') {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } while (runStatus.status !== 'completed');

    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantReply = messages.data.find(msg => msg.role === 'assistant');

    res.send(200, {
      reply: assistantReply?.content[0]?.text?.value || '🤖 No reply from assistant.',
    });
  } catch (error) {
    console.error('Error:', error);
    res.send(500, { reply: '🚨 Internal Server Error.' });
  }
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`✅ HR.Ai server is running on port ${PORT}`);
});
